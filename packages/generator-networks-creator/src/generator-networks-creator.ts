import fs from 'fs';
import path, { parse } from 'path';

import { BayesianNetwork } from 'generative-bayesian-network';
import fetch from 'node-fetch';
import { UAParser } from 'ua-parser-js';

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

async function prepareRecords(
    records: Record<string, any>[],
    preprocessingType: string
): Promise<Record<string, any>[]> {
    const cleanedRecords = [];

    for (const record of records) {
        const {
            requestFingerprint: { headers },
            browserFingerprint: fingerprint,
        } = record;

        // The webdriver attribute should not be truthy
        if (fingerprint.webdriver) continue;

        const validPluginAndMime =
            'plugins' in fingerprint &&
            'mimeTypes' in fingerprint &&
            fingerprint.plugins.length > 0 &&
            fingerprint.mimeTypes.length > 0;

        // The plugins and mimeTypes should be present and non-empty
        if (!validPluginAndMime) continue;

        const validUserAgent =
            fingerprint.userAgent ===
            (headers['user-agent'] ?? headers['User-Agent']);

        // The userAgent should match the one in the headers
        if (!validUserAgent) continue;

        const validUserAgentData =
            !('userAgentData' in fingerprint) ||
            ('brands' in fingerprint.userAgentData &&
                'mobile' in fingerprint.userAgentData &&
                'platform' in fingerprint.userAgentData &&
                fingerprint.userAgentData.brands.length === 3);

        // The userAgentData should have the correct structure
        if (!validUserAgentData) continue;

        const validLanguage =
            fingerprint.language &&
            'languages' in fingerprint &&
            fingerprint.languages.length > 0 &&
            fingerprint.language === fingerprint.languages[0];

        // The language should be the first in the list
        if (!validLanguage) continue;

        const parsedUserAgent = await UAParser(
            fingerprint.userAgent,
            headers
        ).withClientHints();

        const validBrowser =
            parsedUserAgent.browser.name !== undefined &&
            [
                'Edge',
                'Chrome',
                'Chrome Mobile',
                'Firefox',
                'Safari',
                'Safari Mobile',
            ].includes(parsedUserAgent.browser.name);

        // The browser should be one of the supported ones
        if (!validBrowser) continue;

        const desktopFingerprint =
            parsedUserAgent.device.type === undefined ||
            !['wearable', 'mobile'].includes(parsedUserAgent.device.type);

        const validDeviceType =
            parsedUserAgent.device.type === 'mobile' ||
            parsedUserAgent.device.type === 'tablet' ||
            desktopFingerprint;

        // The device type should be mobile, tablet or desktop
        if (!validDeviceType) continue;

        const validTouchSupport =
            desktopFingerprint || fingerprint.userAgentData?.mobile !== true
                ? fingerprint.maxTouchPoints === 0
                : fingerprint.maxTouchPoints > 0;

        // The maxTouchPoints should be 0 for desktops and > 0 for mobile devices
        if (!validTouchSupport) continue;

        const validProduct =
            fingerprint.product === 'Gecko' &&
            parsedUserAgent.browser.name === 'Firefox'
                ? fingerprint.productSub === '20100101'
                : fingerprint.productSub === '20030107';

        // The productSub should be 20100101 for Firefox and 20030107 for the rest
        if (!validProduct) continue;

        const validVendor =
            (parsedUserAgent.browser.name === 'Firefox' &&
                fingerprint.vendor === '') ||
            (parsedUserAgent.browser.name!.startsWith('Safari') &&
                fingerprint.vendor === 'Apple Computer, Inc.') ||
            fingerprint.vendor === 'Google Inc.';

        // The vendor should be Google Inc. for Chrome and Apple Computer, Inc. for Safari
        if (!validVendor) continue;

        const validAppName =
            fingerprint.appName === 'Netscape' &&
            fingerprint.appCodeName === 'Mozilla';

        // The appName should be Netscape and the appCodeName should be Mozilla
        if (!validAppName) continue;

        cleanedRecords.push({
            ...record,
            userAgent: record.browserFingerprint.userAgent,
        } as any);
    }

    // TODO this could break if the list is not there anymore
    // The robots list is available under the MIT license, for details see https://github.com/atmire/COUNTER-Robots/blob/master/LICENSE
    const robotUserAgents = (await fetch(
        'https://raw.githubusercontent.com/atmire/COUNTER-Robots/master/COUNTER_Robots_list.json'
    ).then(async (res) => res.json())) as { pattern: string }[];

    const deconstructedRecords = [];
    const userAgents = new Set();
    for (let x = 0; x < cleanedRecords.length; x++) {
        let record = cleanedRecords[x];
        const { userAgent } = record as { userAgent: string };
        let useRecord =
            !userAgent.match(/(bot|bots|slurp|spider|crawler|crawl)\b/i) &&
            !robotUserAgents.some((robot) =>
                userAgent.match(new RegExp(robot.pattern, 'i'))
            );

        if (useRecord) {
            if (preprocessingType === 'headers') {
                const { httpVersion } = record.requestFingerprint;
                record = record.requestFingerprint.headers;
                record[httpVersionNodeName] = `_${httpVersion}_`;
                if (record[httpVersionNodeName] === '_1.1_') {
                    useRecord = !('user-agent' in record);
                }
            } else {
                record = record.browserFingerprint;
            }
        }

        if (useRecord) {
            deconstructedRecords.push(record);
        } else {
            userAgents.add(userAgent);
        }
    }

    const attributes = new Set<string>();
    deconstructedRecords.forEach((record) => {
        Object.keys(record).forEach((key) => {
            attributes.add(key);
        });
    });

    const reorganizedRecords = [] as Record<string, any>[];
    for (const record of deconstructedRecords) {
        const reorganizedRecord = {} as Record<string, any>;
        for (const attribute of attributes) {
            if (!(attribute in record) || record[attribute] === undefined) {
                reorganizedRecord[attribute] = missingValueDatasetToken;
            } else {
                reorganizedRecord[attribute] = record[attribute];
            }
        }
        reorganizedRecords.push(reorganizedRecord);
    }

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
        userAgent: string
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
        const supportedBrowsers =
            /(firefox|fxios|chrome|crios|safari)\/([0-9.]*)/i;

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
        resultsPath: string
    ) {
        const datasetText = fs.readFileSync(datasetPath, { encoding: 'utf8' });
        const records = await prepareRecords(
            JSON.parse(datasetText),
            'headers'
        );

        const inputGeneratorNetwork = new BayesianNetwork({
            path: path.join(
                __dirname,
                'network_structures',
                'input-network-structure.zip'
            ),
        });
        const headerGeneratorNetwork = new BayesianNetwork({
            path: path.join(
                __dirname,
                'network_structures',
                'header-network-structure.zip'
            ),
        });
        // eslint-disable-next-line dot-notation
        const desiredHeaderAttributes = Object.keys(
            headerGeneratorNetwork['nodesByName']
        ).filter((attribute) => !nonGeneratedNodes.includes(attribute));

        let selectedRecords = records.map((record) => {
            return Object.entries(record).reduce(
                (acc: typeof record, [key, value]) => {
                    if (desiredHeaderAttributes.includes(key))
                        acc[key] = value ?? missingValueDatasetToken;
                    return acc;
                },
                {}
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
            'input-network-definition.zip'
        );
        const headerNetworkDefinitionPath = path.join(
            resultsPath,
            'header-network-definition.zip'
        );
        const browserHelperFilePath = path.join(
            resultsPath,
            'browser-helper-file.json'
        );

        headerGeneratorNetwork.saveNetworkDefinition({
            path: headerNetworkDefinitionPath,
        });
        inputGeneratorNetwork.saveNetworkDefinition({
            path: inputNetworkDefinitionPath,
        });

        const uniqueBrowsersAndHttps = Array.from(
            new Set(
                selectedRecords.map((record) => record[browserHttpNodeName])
            )
        );
        fs.writeFileSync(
            browserHelperFilePath,
            JSON.stringify(uniqueBrowsersAndHttps)
        );
    }

    async prepareFingerprintGeneratorFiles(
        datasetPath: string,
        resultsPath: string
    ) {
        const datasetText = fs
            .readFileSync(datasetPath, { encoding: 'utf8' })
            .replace(/^\ufeff/, '');
        const records = await prepareRecords(
            JSON.parse(datasetText),
            'fingerprints'
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
                'fingerprint-network-structure.zip'
            ),
        });
        // eslint-disable-next-line dot-notation
        const desiredFingerprintAttributes = Object.keys(
            fingerprintGeneratorNetwork['nodesByName']
        );

        const selectedRecords = records.map((record) => {
            return Object.entries(record).reduce(
                (acc: typeof record, [key, value]) => {
                    if (desiredFingerprintAttributes.includes(key))
                        acc[key] = value ?? missingValueDatasetToken;
                    return acc;
                },
                {}
            );
        });

        const fingerprintNetworkDefinitionPath = path.join(
            resultsPath,
            'fingerprint-network-definition.zip'
        );

        // eslint-disable-next-line no-console
        console.log('Building the fingerprint network...');
        fingerprintGeneratorNetwork.setProbabilitiesAccordingToData(
            selectedRecords
        );
        fingerprintGeneratorNetwork.saveNetworkDefinition({
            path: fingerprintNetworkDefinitionPath,
        });
    }
}
