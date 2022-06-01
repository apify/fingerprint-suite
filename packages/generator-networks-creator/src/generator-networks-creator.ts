import { DataFrame, readJSON } from 'danfojs-node';
import fs from 'fs';
import path from 'path';
import { ArrayType2D } from 'danfojs-node/dist/danfojs-base/shared/types';
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
    const cleanedRecords = [];
    for (let x = 0; x < records.length; x++) {
        const record = records[x];
        const { headers } = record.requestFingerprint;

        let headersUserAgent = '';
        if ('user-agent' in headers) {
            headersUserAgent = headers['user-agent'];
        } else {
            headersUserAgent = headers['User-Agent'];
        }

        record.userAgent = headersUserAgent;

        const browserUserAgent = record.browserFingerprint.userAgent;
        if (browserUserAgent === headersUserAgent) {
            cleanedRecords.push(record);
        }
    }

    // TODO this could break if the list is not there anymore
    // The robots list is available under the MIT license, for details see https://github.com/atmire/COUNTER-Robots/blob/master/LICENSE
    const robotUserAgents = await readJSON('https://raw.githubusercontent.com/atmire/COUNTER-Robots/master/COUNTER_Robots_list.json') as DataFrame;

    const deconstructedRecords = [];
    const userAgents = new Set();
    for (let x = 0; x < cleanedRecords.length; x++) {
        let record = cleanedRecords[x];
        const { userAgent } = record;
        let useRecord = !userAgent.match(/(bot|bots|slurp|spider|crawler|crawl)\b/i);
        for (const pattern of robotUserAgents.pattern.values) {
            useRecord = useRecord && !userAgent.match(new RegExp(pattern, 'i'));
        }

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
        /*
            Danfo-js can't read CSVs where field values contain a newline right now, the replace was added to deal with
            issue described in https://github.com/adaltas/node-csv-parse/issues/139
        */
        const datasetText = fs.readFileSync(datasetPath, { encoding: 'utf8' }).replace(/^\ufeff/, '');
        const records = await prepareRecords(JSON.parse(datasetText), 'headers');

        const inputGeneratorNetwork = new BayesianNetwork({ path: path.join(__dirname, 'network_structures', 'input-network-structure.zip') });
        const headerGeneratorNetwork = new BayesianNetwork({ path: path.join(__dirname, 'network_structures', 'header-network-structure.zip') });
        // eslint-disable-next-line dot-notation
        const desiredHeaderAttributes = Object.keys(headerGeneratorNetwork['nodesByName']).filter((attribute) => !nonGeneratedNodes.includes(attribute));
        const headers = new DataFrame(records);

        const selectedHeaders = headers.loc({ columns: desiredHeaderAttributes });
        selectedHeaders.fillna({ values: [missingValueDatasetToken], inplace: true });

        const browsers = [];
        const operatingSystems = [];
        const devices = [];
        const userAgents = selectedHeaders.loc({ columns: ['user-agent', 'User-Agent'] });

        for (const row of userAgents.values as ArrayType2D) {
            let userAgent = row[0] as string;
            if (userAgent === missingValueDatasetToken) {
                userAgent = row[1] as string;
            }
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

            browsers.push(browser);
            operatingSystems.push(operatingSystem);
            devices.push(device);
        }

        selectedHeaders.addColumn(browserNodeName, browsers);
        selectedHeaders.addColumn(operatingSystemNodeName, operatingSystems);
        selectedHeaders.addColumn(deviceNodeName, devices);

        const browserHttps = [];
        for (let x = 0; x < selectedHeaders.shape[0]; x++) {
            const httpVersion = selectedHeaders[httpVersionNodeName].values[x].startsWith('_1') ? '1' : '2';
            browserHttps.push(`${selectedHeaders[browserNodeName].values[x]}|${httpVersion}`);
        }
        selectedHeaders.addColumn(browserHttpNodeName, browserHttps);

        await headerGeneratorNetwork.setProbabilitiesAccordingToData(selectedHeaders as DataFrame);
        await inputGeneratorNetwork.setProbabilitiesAccordingToData(selectedHeaders as DataFrame);

        const inputNetworkDefinitionPath = path.join(resultsPath, 'input-network-definition.json');
        const headerNetworkDefinitionPath = path.join(resultsPath, 'header-network-definition.json');
        const browserHelperFilePath = path.join(resultsPath, 'browser-helper-file.json');

        headerGeneratorNetwork.saveNetworkDefinition({ path: headerNetworkDefinitionPath });
        inputGeneratorNetwork.saveNetworkDefinition({ path: inputNetworkDefinitionPath });

        const uniqueBrowsersAndHttps = await selectedHeaders[browserHttpNodeName].unique().values;
        fs.writeFileSync(browserHelperFilePath, JSON.stringify(uniqueBrowsersAndHttps));
    }

    async prepareFingerprintGeneratorFiles(datasetPath: string) {
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

            record.pluginsData = pluginCharacteristics !== {} ? pluginCharacteristics : missingValueDatasetToken;

            for (const attribute of Object.keys(record)) {
                if (record[attribute] === '') {
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
        const fingerprints = new DataFrame(records);

        const selectedFingerprints = fingerprints.loc({ columns: desiredFingerprintAttributes });
        selectedFingerprints.fillna({ values: [missingValueDatasetToken], inplace: true });

        const fingerprintNetworkDefinitionPath = path.join(__dirname, '..', 'results', 'fingerprint-network-definition.zip');

        await fingerprintGeneratorNetwork.setProbabilitiesAccordingToData(selectedFingerprints as DataFrame);
        fingerprintGeneratorNetwork.saveNetworkDefinition({ path: fingerprintNetworkDefinitionPath });
    }
}
