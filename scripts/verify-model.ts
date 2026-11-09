/* eslint-disable no-console */
/**
 * Post-build sanity gate for the generated fingerprint/header model.
 *
 * Runs after `netgen.ts` (and the rebuild that follows it) and refuses to let a
 * degraded model progress any further. This exists because of
 * https://github.com/apify/fingerprint-suite/issues/564: the automated update
 * shipped a model whose newest Chrome was 143 while the world was on 150, so
 * `browserListQuery: 'last 5 chrome versions'` matched nothing and threw. The
 * existing test suite passed, because nothing asserted the model actually covers
 * current browsers.
 *
 * Checks, in order of how directly they map to user-visible breakage:
 *   1. functional  — the browserslist queries users actually write still resolve
 *   2. freshness   — the model is not lagging far behind current browser releases
 *   3. regression  — no browser's newest version went backwards vs the committed model
 *   4. plausibility — no bogus browsers/versions (e.g. `safari/605.1`, a WebKit build)
 *   5. volume      — the model did not lose a large share of its browser coverage
 *
 * Exits non-zero listing every failure, so one run reports the full picture.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import browserslist from 'browserslist';

// Imported by relative path rather than package name so this script needs no
// entry in the root manifest, and so it exercises the same sources the packages
// publish.
import { FingerprintGenerator } from '../packages/fingerprint-generator/src';
import { HeaderGenerator } from '../packages/header-generator/src';

const REPO_ROOT = path.join(__dirname, '..');
const HELPER_FILE_REL =
    'packages/header-generator/src/data_files/browser-helper-file.json';

/** Browsers the model is expected to cover, and the plausible range for a major version. */
const EXPECTED_BROWSERS = {
    chrome: { minMajor: 60, maxMajor: 300, freshnessTolerance: 3 },
    firefox: { minMajor: 60, maxMajor: 300, freshnessTolerance: 3 },
    edge: { minMajor: 60, maxMajor: 300, freshnessTolerance: 3 },
    // Safari jumped 18 -> 26 when Apple moved to year-based versioning, so the
    // upper bound is generous. It must stay well below WebKit build numbers
    // (604.x / 605.x), which is exactly the corruption seen in #564.
    safari: { minMajor: 11, maxMajor: 100, freshnessTolerance: 2 },
} as const;

type BrowserName = keyof typeof EXPECTED_BROWSERS;

/** A model that covers fewer than this fraction of the previous one is suspect. */
const MIN_COMBO_RETENTION = 0.6;

const failures: string[] = [];
const warnings: string[] = [];

function fail(check: string, message: string) {
    failures.push(`[${check}] ${message}`);
}

function warn(check: string, message: string) {
    warnings.push(`[${check}] ${message}`);
}

/** `['chrome/150.0.0.0|2', ...]` -> `{ chrome: [150, 149, ...] }` (majors, desc). */
function parseHelperFile(entries: string[]): {
    majorsByBrowser: Map<string, number[]>;
    unparsed: string[];
} {
    const majorsByBrowser = new Map<string, number[]>();
    const unparsed: string[] = [];

    for (const entry of entries) {
        const [browserVersion] = entry.split('|');
        const separator = browserVersion.lastIndexOf('/');

        if (separator === -1) {
            unparsed.push(entry);
            continue;
        }

        const name = browserVersion.slice(0, separator);
        const major = Number.parseInt(browserVersion.slice(separator + 1), 10);

        if (!Number.isFinite(major)) {
            unparsed.push(entry);
            continue;
        }

        const majors = majorsByBrowser.get(name) ?? [];
        majors.push(major);
        majorsByBrowser.set(name, majors);
    }

    for (const majors of majorsByBrowser.values()) {
        majors.sort((a, b) => b - a);
    }

    return { majorsByBrowser, unparsed };
}

/** The newest major version browserslist knows about for a browser, if any. */
function newestKnownMajor(browser: BrowserName): number | null {
    try {
        const [newest] = browserslist(`last 1 ${browser} version`);
        if (!newest) return null;
        const major = Number.parseInt(newest.split(' ')[1], 10);
        return Number.isFinite(major) ? major : null;
    } catch {
        return null;
    }
}

/** The committed model's helper file, i.e. what we are about to replace. */
function previousHelperEntries(): string[] | null {
    try {
        const raw = execFileSync('git', ['show', `HEAD:${HELPER_FILE_REL}`], {
            cwd: REPO_ROOT,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        });
        return JSON.parse(raw) as string[];
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// 1. Functional: the queries users actually write must resolve.
// ---------------------------------------------------------------------------
function checkQueriesResolve() {
    const queries = [
        ...Object.keys(EXPECTED_BROWSERS).map(
            (browser) => `last 5 ${browser} versions`,
        ),
        'last 2 versions',
        'last 10 chrome versions',
        '> 0.5%',
    ];

    for (const browserListQuery of queries) {
        try {
            const headers = new HeaderGenerator({
                browserListQuery,
            }).getHeaders();

            if (!headers['user-agent'] && !headers['User-Agent']) {
                fail(
                    'functional',
                    `query '${browserListQuery}' produced headers without a User-Agent.`,
                );
            }
        } catch (error) {
            fail(
                'functional',
                `query '${browserListQuery}' cannot generate headers — this is the #564 failure mode. ${
                    (error as Error).message
                }`,
            );
        }
    }

    // Per-browser generation, independent of browserslist data.
    for (const browser of Object.keys(EXPECTED_BROWSERS)) {
        try {
            new HeaderGenerator({
                browsers: [browser as BrowserName],
            }).getHeaders();
        } catch (error) {
            fail(
                'functional',
                `cannot generate headers for browser '${browser}'. ${
                    (error as Error).message
                }`,
            );
        }
    }

    try {
        const { fingerprint } = new FingerprintGenerator().getFingerprint();
        if (!fingerprint?.navigator?.userAgent) {
            fail(
                'functional',
                'generated fingerprint has no navigator.userAgent.',
            );
        }
        if (
            !(fingerprint?.screen?.width > 0 && fingerprint?.screen?.height > 0)
        ) {
            fail(
                'functional',
                'generated fingerprint has non-positive screen dimensions.',
            );
        }
    } catch (error) {
        fail(
            'functional',
            `fingerprint generation failed outright. ${(error as Error).message}`,
        );
    }
}

/**
 * Writes a human-readable before/after summary for the model-update pull request,
 * so a reviewer can see at a glance what the new model actually covers.
 */
function writeSummary(
    entries: string[],
    current: Map<string, number[]>,
    previousEntries: string[] | null,
    previous: Map<string, number[]> | null,
) {
    const lines = [
        '### Model coverage',
        '',
        '| browser | newest (before) | newest (after) | versions |',
        '| --- | --- | --- | --- |',
    ];

    for (const browser of Object.keys(EXPECTED_BROWSERS).sort()) {
        const majors = current.get(browser);
        const before = previous?.get(browser)?.[0];
        lines.push(
            `| ${browser} | ${before ?? '—'} | ${majors?.[0] ?? '**missing**'} | ${
                majors?.length ?? 0
            } |`,
        );
    }

    lines.push(
        '',
        `Browser/HTTP-version combinations: ${
            previousEntries ? `${previousEntries.length} → ` : ''
        }${entries.length}`,
    );

    if (warnings.length > 0) {
        lines.push('', '### Warnings', '');
        for (const warning of warnings) lines.push(`- ${warning}`);
    }

    fs.writeFileSync(
        path.join(REPO_ROOT, 'model-summary.md'),
        `${lines.join('\n')}\n`,
    );
}

// ---------------------------------------------------------------------------
// 2-5. Data-shape checks over the helper file.
// ---------------------------------------------------------------------------
function checkHelperFile() {
    const helperPath = path.join(REPO_ROOT, HELPER_FILE_REL);
    const entries = JSON.parse(
        fs.readFileSync(helperPath, { encoding: 'utf8' }),
    ) as string[];

    const { majorsByBrowser, unparsed } = parseHelperFile(entries);

    console.log(
        `Model covers ${entries.length} browser/HTTP-version combinations:`,
    );
    for (const [browser, majors] of [...majorsByBrowser].sort()) {
        console.log(
            `  ${browser.padEnd(10)} newest ${String(majors[0]).padEnd(
                5,
            )} (${majors.length} versions)`,
        );
    }

    if (unparsed.length > 0) {
        fail(
            'plausibility',
            `${unparsed.length} helper-file entries are not parseable as browser/version: ${unparsed
                .slice(0, 5)
                .join(', ')}`,
        );
    }

    for (const [browser, config] of Object.entries(EXPECTED_BROWSERS) as [
        BrowserName,
        (typeof EXPECTED_BROWSERS)[BrowserName],
    ][]) {
        const majors = majorsByBrowser.get(browser);

        if (!majors || majors.length === 0) {
            fail(
                'plausibility',
                `model contains no '${browser}' entries at all.`,
            );
            continue;
        }

        // 4. Plausibility — catches `safari/605.1` (a WebKit build number).
        const newest = majors[0];
        const oldest = majors[majors.length - 1];

        if (newest > config.maxMajor) {
            fail(
                'plausibility',
                `newest '${browser}' version is ${newest}, above the plausible maximum of ${config.maxMajor}. ` +
                    `This usually means a build/engine number was parsed as a browser version.`,
            );
        }
        if (oldest < config.minMajor) {
            warn(
                'plausibility',
                `oldest '${browser}' version is ${oldest}, below the expected minimum of ${config.minMajor}.`,
            );
        }

        // 2. Freshness — the #564 symptom.
        const known = newestKnownMajor(browser);
        if (known === null) {
            warn(
                'freshness',
                `browserslist knows no versions for '${browser}'; skipped.`,
            );
        } else if (newest < known - config.freshnessTolerance) {
            fail(
                'freshness',
                `newest '${browser}' in the model is ${newest}, but browserslist's newest is ${known} ` +
                    `(tolerance ${config.freshnessTolerance}). Queries selecting recent ${browser} versions will match nothing.`,
            );
        }
    }

    // 3. Regression + 5. Volume, against the model we are replacing.
    const previous = previousHelperEntries();
    if (previous === null) {
        warn(
            'regression',
            `could not read the committed ${HELPER_FILE_REL} from git; skipped comparison against the previous model.`,
        );
        writeSummary(entries, majorsByBrowser, null, null);
        return;
    }

    const { majorsByBrowser: previousMajors } = parseHelperFile(previous);
    writeSummary(entries, majorsByBrowser, previous, previousMajors);

    for (const [browser, majors] of previousMajors) {
        const current = majorsByBrowser.get(browser);
        if (!current || current.length === 0) continue;

        if (current[0] < majors[0]) {
            fail(
                'regression',
                `newest '${browser}' went backwards: ${majors[0]} in the committed model, ${current[0]} in the new one. ` +
                    `A newer model should never cover older browsers.`,
            );
        }
    }

    if (previous.length > 0) {
        const retention = entries.length / previous.length;
        if (retention < MIN_COMBO_RETENTION) {
            fail(
                'volume',
                `model covers ${entries.length} browser/HTTP combinations, down from ${
                    previous.length
                } (${(retention * 100).toFixed(
                    0,
                )}% retained, floor ${(MIN_COMBO_RETENTION * 100).toFixed(0)}%).`,
            );
        }
    }
}

checkQueriesResolve();
checkHelperFile();

if (warnings.length > 0) {
    console.warn(`\n${warnings.length} warning(s):`);
    for (const warning of warnings) console.warn(`  ! ${warning}`);
}

if (failures.length > 0) {
    console.error(
        `\nModel verification FAILED with ${failures.length} problem(s):`,
    );
    for (const failure of failures) console.error(`  x ${failure}`);
    console.error(
        '\nThe generated model is not fit to ship. Inspect the source dataset and the ' +
            'record schema before overriding this gate.',
    );
    process.exit(1);
}

console.log('\nModel verification passed.');
