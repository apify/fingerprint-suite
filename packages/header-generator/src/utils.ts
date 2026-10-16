import { createRequire } from 'node:module';

import type browsersList from 'browserslist';

import { SUPPORTED_BROWSERS } from './constants.js';
import type { BrowserName, BrowserSpecification } from './header-generator.js';

const require = createRequire(import.meta.url);

/**
 * `browserslist` is an optional peer dependency (its data is several MB), and it is only needed to resolve
 * a `browserListQuery`. It is loaded on first use, and a missing installation is reported with a hint.
 */
const loadBrowserslist = (): typeof browsersList => {
    try {
        return require('browserslist');
    } catch (error) {
        if (
            (error as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND' &&
            (error as Error).message.includes("Cannot find module 'browserslist'")
        ) {
            throw new Error(
                'The `browserListQuery` option (used by the `PRESETS` as well) needs the `browserslist` package, ' +
                    'which is an optional peer dependency of `header-generator`. Install it with `npm install browserslist`.',
                { cause: error },
            );
        }
        throw error;
    }
};

export const getUserAgent = (
    headers: Record<string, string>,
): string | undefined => {
    for (const [header, value] of Object.entries(headers)) {
        if (header.toLowerCase() === 'user-agent') {
            return value;
        }
    }
    return undefined;
};

export const getBrowser = (userAgent?: string): BrowserName | undefined => {
    if (!userAgent) {
        return undefined;
    }

    let browser;
    if (userAgent.includes('Firefox')) {
        browser = 'firefox';
    } else if (userAgent.includes('Chrome')) {
        browser = 'chrome';
    } else {
        browser = 'safari';
    }

    return browser as BrowserName;
};

const getBrowsersWithVersions = (
    browserList: string[],
): Record<BrowserName, number[]> => {
    const browsersWithVersions: Record<string, number[]> = {};

    for (const browserDefinition of browserList) {
        const [browserSplit, versionString] = browserDefinition.split(' ');
        const browser = browserSplit as BrowserName;
        const version = parseInt(versionString, 10);
        if (!SUPPORTED_BROWSERS.includes(browser)) {
            continue;
        }

        if (browsersWithVersions[browser]) {
            browsersWithVersions[browser].push(version);
        } else {
            browsersWithVersions[browser] = [version];
        }
    }

    return browsersWithVersions;
};

const getOptimizedVersionDistribution = (
    browsersWithVersions: Record<BrowserName, number[]>,
): BrowserSpecification[] => {
    const finalOptimizedBrowsers: BrowserSpecification[] = [];

    Object.entries(browsersWithVersions).forEach(([browser, versions]) => {
        const sortedVersions = versions.sort((a, b) => a - b);
        let lowestVersionSoFar = sortedVersions[0];

        sortedVersions.forEach((version, index) => {
            const nextVersion = sortedVersions[index + 1];
            const isLast = index === sortedVersions.length - 1;
            const isNextVersionGap = nextVersion - version > 1;

            if (isNextVersionGap || isLast) {
                finalOptimizedBrowsers.push({
                    name: browser as BrowserName,
                    minVersion: lowestVersionSoFar,
                    maxVersion: version,
                });
                lowestVersionSoFar = nextVersion;
            }
        });
    });
    return finalOptimizedBrowsers;
};

export const getBrowsersFromQuery = (
    browserListQuery: string,
): BrowserSpecification[] => {
    const browserList = loadBrowserslist()(browserListQuery);
    const browsersWithVersions = getBrowsersWithVersions(browserList);
    return getOptimizedVersionDistribution(browsersWithVersions);
};

export const shuffleArray = (array: any[]): any[] => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
};
