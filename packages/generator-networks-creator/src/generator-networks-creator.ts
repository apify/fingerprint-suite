import fs from 'fs';
import path from 'path';

import { BayesianNetwork } from 'generative-bayesian-network';
import { getRecordSchema } from './record-schema';

const browserHttpNodeName = '*BROWSER_HTTP';
const httpVersionNodeName = '*HTTP_VERSION';
const browserNodeName = '*BROWSER';
const operatingSystemNodeName = '*OPERATING_SYSTEM';
const deviceNodeName = '*DEVICE';
const missingValueDatasetToken = '*MISSING_VALUE*';

const nonGeneratedNodes = [
    browserHttpNodeName,
    browserNodeName,
    operatingSystemNodeName,
    deviceNodeName,
];

const STRINGIFIED_PREFIX = '*STRINGIFIED*';

const PLUGIN_CHARACTERISTICS_ATTRIBUTES = ['plugins', 'mimeTypes'];

/**
 * Below this share of input records passing schema validation, the input dataset is
 * treated as broken rather than merely noisy. A model built from that little data is
 * not worth shipping, and silently shipping one is how a degraded collector reaches
 * npm unnoticed.
 */
const MIN_VALID_RECORD_RATIO = 0.25;

/** Absolute floor on usable records, regardless of ratio. */
const MIN_VALID_RECORDS = 2000;

async function prepareRecords(
    records: Record<string, any>[],
    preprocessingType: string,
): Promise<Record<string, any>[]> {
    const recordSchema = await getRecordSchema();

    const parsed = records.map((x) => recordSchema.safeParse(x));
    const cleanedRecords = parsed
        .filter((record) => record.success)
        .map((record) => record.data);

    const ratio =
        records.length === 0 ? 0 : cleanedRecords.length / records.length;

    console.log(
        `Found ${cleanedRecords.length}/${records.length} valid records (${(
            ratio * 100
        ).toFixed(1)}%).`,
    );

    // Attribute the rejections. Without this, a validation change or a collector
    // regression that quietly discards most of the input is invisible in the logs.
    const reasons = new Map<string, number>();
    for (const record of parsed) {
        if (record.success) continue;
        const seen = new Set<string>();
        for (const issue of record.error.issues) {
            const key = `${issue.path.join('.') || '<root>'}: ${issue.message}`;
            seen.add(key);
        }
        for (const key of seen) reasons.set(key, (reasons.get(key) ?? 0) + 1);
    }

    if (reasons.size > 0) {
        console.log('Top rejection reasons:');
        for (const [reason, count] of [...reasons.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)) {
            console.log(`  ${String(count).padStart(6)}  ${reason}`);
        }
    }

    if (
        cleanedRecords.length < MIN_VALID_RECORDS ||
        ratio < MIN_VALID_RECORD_RATIO
    ) {
        throw new Error(
            `Refusing to build the ${preprocessingType} model: only ${
                cleanedRecords.length
            }/${records.length} (${(ratio * 100).toFixed(
                1,
            )}%) input records are valid, below the ${MIN_VALID_RECORDS}-record / ${(
                MIN_VALID_RECORD_RATIO * 100
            ).toFixed(
                0,
            )}% floor. Either the source dataset is degraded or the record schema needs updating — see the rejection reasons above.`,
        );
    }

    const deconstructedRecords = cleanedRecords
        .map((record) => {
            if (preprocessingType === 'headers') {
                const { httpVersion, headers } = record.requestFingerprint;
                headers[httpVersionNodeName] = `_${httpVersion}_`;

                return headers;
            } else {
                return record.browserFingerprint;
            }
        })
        .filter((x) => x);

    const attributes = new Set<keyof (typeof deconstructedRecords)[number]>(
        deconstructedRecords.flatMap((record) =>
            Object.keys(record || {}),
        ) as (keyof (typeof deconstructedRecords)[number])[],
    );

    const reorganizedRecords = deconstructedRecords.map((record) => {
        const reorganizedRecord = {} as Record<string, any>;
        for (const attribute of attributes) {
            reorganizedRecord[attribute] =
                record[attribute] === undefined
                    ? missingValueDatasetToken
                    : record[attribute];
        }
        return reorganizedRecord;
    });

    return reorganizedRecords;
}

export class GeneratorNetworksCreator {
    private getDeviceOS(userAgent: string): {
        device: string;
        operatingSystem: string;
    } {
        let operatingSystem = missingValueDatasetToken;
        if (/windows/i.test(userAgent)) {
            operatingSystem = 'windows';
        }
        let device = 'desktop';
        if (/phone|android|mobile/i.test(userAgent)) {
            device = 'mobile';
            if (/iphone|mac/i.test(userAgent)) {
                operatingSystem = 'ios';
            } else if (/android/i.test(userAgent)) {
                operatingSystem = 'android';
            }
        } else if (/linux/i.test(userAgent)) {
            operatingSystem = 'linux';
        } else if (/mac/i.test(userAgent)) {
            operatingSystem = 'macos';
        }

        return { device, operatingSystem };
    }

    private getBrowserNameVersion(
        userAgent: string,
    ): `${string}/${string}` | typeof missingValueDatasetToken {
        const canonicalNames = {
            chrome: 'chrome',
            crios: 'chrome',
            firefox: 'firefox',
            fxios: 'firefox',
            safari: 'safari',
            edge: 'edge',
            edg: 'edge',
            edga: 'edge',
            edgios: 'edge',
        } as Record<string, string>;

        const unsupportedBrowsers =
            /opr|yabrowser|SamsungBrowser|UCBrowser|vivaldi/i;
        const edge = /(edg(a|ios|e)?)\/([0-9.]*)/i;
        const safari = /Version\/([\d.]+)( Mobile\/[a-z0-9]+)? Safari/i;
        // `safari` is deliberately absent here: the `Safari/x.y.z` token carries the
        // WebKit build number, not the Safari version. Only the `Version/x.y` token
        // (handled by `safari` above) does. Matching `Safari/...` as a fallback would
        // mint bogus browsers like `safari/605.1` that no browserslist query can ever
        // select, silently corrupting the model.
        const supportedBrowsers = /(firefox|fxios|chrome|crios)\/([0-9.]*)/i;

        if (unsupportedBrowsers.test(userAgent)) {
            return missingValueDatasetToken;
        }

        if (edge.test(userAgent)) {
            const match = userAgent.match(edge)![0].split('/');
            return `edge/${match[1]}`;
        }

        if (safari.test(userAgent)) {
            const match = userAgent.match(safari);
            return `safari/${match![1]}`;
        }

        if (supportedBrowsers.test(userAgent)) {
            const match = userAgent.match(supportedBrowsers)![0].split('/');
            return `${canonicalNames[match[0].toLowerCase()]}/${match[1]}`;
        }

        return missingValueDatasetToken;
    }

    async prepareHeaderGeneratorFiles(
        datasetPath: string,
        resultsPath: string,
    ) {
        const datasetText = fs.readFileSync(datasetPath, { encoding: 'utf8' });
        const records = await prepareRecords(
            JSON.parse(datasetText),
            'headers',
        );

        const inputGeneratorNetwork = new BayesianNetwork({
            path: path.join(
                __dirname,
                'network_structures',
                'input-network-structure.zip',
            ),
        });
        const headerGeneratorNetwork = new BayesianNetwork({
            path: path.join(
                __dirname,
                'network_structures',
                'header-network-structure.zip',
            ),
        });
        // eslint-disable-next-line dot-notation
        const desiredHeaderAttributes = Object.keys(
            headerGeneratorNetwork['nodesByName'],
        ).filter((attribute) => !nonGeneratedNodes.includes(attribute));

        let selectedRecords = records.map((record) => {
            return Object.entries(record).reduce(
                (acc: typeof record, [key, value]) => {
                    if (desiredHeaderAttributes.includes(key))
                        acc[key] = value ?? missingValueDatasetToken;
                    return acc;
                },
                {},
            );
        });

        selectedRecords = selectedRecords.map((record) => {
            const userAgent = (
                record['user-agent'] !== missingValueDatasetToken
                    ? record['user-agent']
                    : record['User-Agent']
            ).toLowerCase();

            const browser = this.getBrowserNameVersion(userAgent);
            const { device, operatingSystem } = this.getDeviceOS(userAgent);

            return {
                ...record,
                [browserNodeName]: browser,
                [operatingSystemNodeName]: operatingSystem,
                [deviceNodeName]: device,
                [browserHttpNodeName]: `${browser}|${
                    (record[httpVersionNodeName] as string).startsWith('_1')
                        ? '1'
                        : '2'
                }`,
            };
        });

        headerGeneratorNetwork.setProbabilitiesAccordingToData(selectedRecords);
        inputGeneratorNetwork.setProbabilitiesAccordingToData(selectedRecords);

        const inputNetworkDefinitionPath = path.join(
            resultsPath,
            'input-network-definition.zip',
        );
        const headerNetworkDefinitionPath = path.join(
            resultsPath,
            'header-network-definition.zip',
        );
        const browserHelperFilePath = path.join(
            resultsPath,
            'browser-helper-file.json',
        );

        headerGeneratorNetwork.saveNetworkDefinition({
            path: headerNetworkDefinitionPath,
        });
        inputGeneratorNetwork.saveNetworkDefinition({
            path: inputNetworkDefinitionPath,
        });

        const uniqueBrowsersAndHttps = Array.from(
            new Set(
                selectedRecords.map((record) => record[browserHttpNodeName]),
            ),
        );
        fs.writeFileSync(
            browserHelperFilePath,
            JSON.stringify(uniqueBrowsersAndHttps),
        );
    }

    async prepareFingerprintGeneratorFiles(
        datasetPath: string,
        resultsPath: string,
    ) {
        const datasetText = fs
            .readFileSync(datasetPath, { encoding: 'utf8' })
            .replace(/^\ufeff/, '');
        const records = await prepareRecords(
            JSON.parse(datasetText),
            'fingerprints',
        );
        for (let x = 0; x < records.length; x++) {
            // eslint-disable-next-line no-console
            if (x % 1000 === 0)
                console.log(`Processing record ${x} of ${records.length}`);
            const record = records[x];
            const pluginCharacteristics = {} as { [key: string]: string };
            for (const pluginCharacteristicsAttribute of PLUGIN_CHARACTERISTICS_ATTRIBUTES) {
                if (pluginCharacteristicsAttribute in record) {
                    if (record[pluginCharacteristicsAttribute] !== '') {
                        pluginCharacteristics[pluginCharacteristicsAttribute] =
                            record[pluginCharacteristicsAttribute];
                    }
                    delete record[pluginCharacteristicsAttribute];
                }
            }

            record.pluginsData =
                Object.keys(pluginCharacteristics).length !== 0
                    ? pluginCharacteristics
                    : missingValueDatasetToken;

            for (const attribute of Object.keys(record)) {
                if ([null, '', undefined].includes(record[attribute])) {
                    record[attribute] = missingValueDatasetToken;
                } else {
                    record[attribute] =
                        typeof record[attribute] === 'string' ||
                        record[attribute] instanceof String
                            ? record[attribute]
                            : STRINGIFIED_PREFIX +
                              JSON.stringify(record[attribute]);
                }
            }

            records[x] = record;
        }

        const fingerprintGeneratorNetwork = new BayesianNetwork({
            path: path.join(
                __dirname,
                'network_structures',
                'fingerprint-network-structure.zip',
            ),
        });
        // eslint-disable-next-line dot-notation
        const desiredFingerprintAttributes = Object.keys(
            fingerprintGeneratorNetwork['nodesByName'],
        );

        const selectedRecords = records.map((record) => {
            return Object.entries(record).reduce(
                (acc: typeof record, [key, value]) => {
                    if (desiredFingerprintAttributes.includes(key))
                        acc[key] = value ?? missingValueDatasetToken;
                    return acc;
                },
                {},
            );
        });

        const fingerprintNetworkDefinitionPath = path.join(
            resultsPath,
            'fingerprint-network-definition.zip',
        );

        // eslint-disable-next-line no-console
        console.log('Building the fingerprint network...');
        fingerprintGeneratorNetwork.setProbabilitiesAccordingToData(
            selectedRecords,
        );
        fingerprintGeneratorNetwork.saveNetworkDefinition({
            path: fingerprintNetworkDefinitionPath,
        });
    }
}
