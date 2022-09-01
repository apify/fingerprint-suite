import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { BayesianNetwork } from 'generative-bayesian-network';

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

const PLUGIN_CHARACTERISTICS_ATTRIBUTES = [
    'plugins',
    'mimeTypes',
];

function isEdge(browserAndVersion: string) {
    return browserAndVersion.startsWith('edg');
}

async function prepareRecords(records: Record<string, any>[], preprocessingType: string) : Promise<Record<string, any>[]> {
    const cleanedRecords = records
        .filter((
            {
                requestFingerprint: { headers },
                browserFingerprint,
            }) => {
            return (headers['user-agent'] ?? headers['User-Agent']) === browserFingerprint.userAgent;
        })
        .filter(
            ({
                browserFingerprint: {
                    screen: { width, height },
                },
                requestFingerprint: {
                    headers,
                },
            }) => ((width >= 1280 && width > height) || (width < height && headers['sec-ch-ua-mobile'] === '?1')),
        )
        .map((record) => ({ ...record, userAgent: record.browserFingerprint.userAgent } as any));

    // TODO this could break if the list is not there anymore
    // The robots list is available under the MIT license, for details see https://github.com/atmire/COUNTER-Robots/blob/master/LICENSE
    const robotUserAgents = await fetch('https://raw.githubusercontent.com/atmire/COUNTER-Robots/master/COUNTER_Robots_list.json')
        .then((res) => res.json()) as {pattern: string}[];

    const deconstructedRecords = [];
    const userAgents = new Set();
    for (let x = 0; x < cleanedRecords.length; x++) {
        let record = cleanedRecords[x];
        const { userAgent } = record as { userAgent: string };
        let useRecord = !userAgent.match(/(bot|bots|slurp|spider|crawler|crawl)\b/i)
            && !robotUserAgents.some((robot) => userAgent.match(new RegExp(robot.pattern, 'i')));

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

        if (useRecord) { deconstructedRecords.push(record); } else {
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
    async prepareHeaderGeneratorFiles(datasetPath: string, resultsPath: string) {
        const datasetText = fs.readFileSync(datasetPath, { encoding: 'utf8' });
        const records = await prepareRecords(JSON.parse(datasetText), 'headers');

        const inputGeneratorNetwork = new BayesianNetwork({ path: path.join(__dirname, 'network_structures', 'input-network-structure.zip') });
        const headerGeneratorNetwork = new BayesianNetwork({ path: path.join(__dirname, 'network_structures', 'header-network-structure.zip') });
        // eslint-disable-next-line dot-notation
        const desiredHeaderAttributes = Object.keys(headerGeneratorNetwork['nodesByName'])
            .filter((attribute) => !nonGeneratedNodes.includes(attribute));

        let selectedRecords = records.map((record) => {
            return Object.entries(record).reduce((acc: typeof record, [key, value]) => {
                if (desiredHeaderAttributes.includes(key)) acc[key] = value ?? missingValueDatasetToken;
                return acc;
            }, {});
        });

        selectedRecords = selectedRecords.map((record) => {
            let userAgent = (record['user-agent'] !== missingValueDatasetToken ? record['user-agent'] : record['User-Agent']) as string;
            userAgent = userAgent.toLowerCase();

            let operatingSystem = missingValueDatasetToken;
            if (/windows/.test(userAgent)) {
                operatingSystem = 'windows';
            }
            let device = 'desktop';
            if (/phone|android|mobile/.test(userAgent)) {
                device = 'mobile';
                if (/iphone|mac/.test(userAgent)) {
                    operatingSystem = 'ios';
                } else if (/android/.test(userAgent)) {
                    operatingSystem = 'android';
                }
            } else if (/linux/.test(userAgent)) {
                operatingSystem = 'linux';
            } else if (/mac/.test(userAgent)) {
                operatingSystem = 'macos';
            }

            let browser = missingValueDatasetToken;
            const matches = userAgent.match(/(firefox|chrome|safari|edg(a|ios|e)?)\/([0-9.]*)/gi);
            if (matches && !(/OPR\/[0-9.]*/.test(userAgent))) {
                for (const match of matches) {
                    if (isEdge(match)) {
                        browser = `edge/${match.split('/')[1]}`;
                        break;
                    }
                }
                if (browser === missingValueDatasetToken) {
                    browser = matches[0];
                }
            }

            return {
                ...record,
                [browserNodeName]: browser,
                [operatingSystemNodeName]: operatingSystem,
                [deviceNodeName]: device,
                [browserHttpNodeName]: `${browser}|${(record[httpVersionNodeName] as string).startsWith('_1') ? '1' : '2'}`,
            };
        });

        await headerGeneratorNetwork.setProbabilitiesAccordingToData(selectedRecords);
        await inputGeneratorNetwork.setProbabilitiesAccordingToData(selectedRecords);

        const inputNetworkDefinitionPath = path.join(resultsPath, 'input-network-definition.zip');
        const headerNetworkDefinitionPath = path.join(resultsPath, 'header-network-definition.zip');
        const browserHelperFilePath = path.join(resultsPath, 'browser-helper-file.json');

        headerGeneratorNetwork.saveNetworkDefinition({ path: headerNetworkDefinitionPath });
        inputGeneratorNetwork.saveNetworkDefinition({ path: inputNetworkDefinitionPath });

        const uniqueBrowsersAndHttps = await Array.from(new Set(selectedRecords.map((record) => record[browserHttpNodeName])));
        fs.writeFileSync(browserHelperFilePath, JSON.stringify(uniqueBrowsersAndHttps));
    }

    async prepareFingerprintGeneratorFiles(datasetPath: string, resultsPath: string) {
        const datasetText = fs.readFileSync(datasetPath, { encoding: 'utf8' }).replace(/^\ufeff/, '');
        const records = await prepareRecords(JSON.parse(datasetText), 'fingerprints');
        for (let x = 0; x < records.length; x++) {
            const record = records[x];
            const pluginCharacteristics = {} as { [key: string]: string };
            for (const pluginCharacteristicsAttribute of PLUGIN_CHARACTERISTICS_ATTRIBUTES) {
                if (pluginCharacteristicsAttribute in record) {
                    if (record[pluginCharacteristicsAttribute] !== '') {
                        pluginCharacteristics[pluginCharacteristicsAttribute] = record[pluginCharacteristicsAttribute];
                    }
                    delete record[pluginCharacteristicsAttribute];
                }
            }

            record.pluginsData = Object.keys(pluginCharacteristics).length !== 0 ? pluginCharacteristics : missingValueDatasetToken;

            for (const attribute of Object.keys(record)) {
                if ([null, '', undefined].includes(record[attribute])) {
                    record[attribute] = missingValueDatasetToken;
                } else {
                    record[attribute] = (typeof record[attribute] === 'string' || record[attribute] instanceof String)
                        ? record[attribute]
                        : (STRINGIFIED_PREFIX + JSON.stringify(record[attribute]));
                }
            }

            records[x] = record;
        }

        const fingerprintGeneratorNetwork = new BayesianNetwork({ path: path.join(__dirname, 'network_structures', 'fingerprint-network-structure.zip') });
        // eslint-disable-next-line dot-notation
        const desiredFingerprintAttributes = Object.keys(fingerprintGeneratorNetwork['nodesByName']);

        const selectedRecords = records.map((record) => {
            return Object.entries(record).reduce((acc: typeof record, [key, value]) => {
                if (desiredFingerprintAttributes.includes(key)) acc[key] = value ?? missingValueDatasetToken;
                return acc;
            }, {});
        });

        const fingerprintNetworkDefinitionPath = path.join(resultsPath, 'fingerprint-network-definition.zip');

        await fingerprintGeneratorNetwork.setProbabilitiesAccordingToData(selectedRecords);
        fingerprintGeneratorNetwork.saveNetworkDefinition({ path: fingerprintNetworkDefinitionPath });
    }
}
