const { BayesianNetwork } = require("generative-bayesian-network");
const dfd = require("danfojs-node");
const parse = require('csv-parse/lib/sync');
const fs = require("fs");
const path = require("path");

const headerNetworkStructurePath = path.join(__dirname, "network_structures", "header-network-structure.json");
const headerNetworkStructure = require(headerNetworkStructurePath);

const inputNetworkStructurePath = path.join(__dirname, "network_structures", "input-network-structure.json");
const inputNetworkStructure = require(inputNetworkStructurePath);

const fingerprintNetworkStructurePath = path.join(__dirname, "network_structures", "fingerprint-network-structure.json");
const fingerprintNetworkStructure = require(fingerprintNetworkStructurePath);

const browserHttpNodeName = '*BROWSER_HTTP';
const httpVersionNodeName = "*HTTP_VERSION";
const browserNodeName = '*BROWSER';
const operatingSystemNodeName = '*OPERATING_SYSTEM';
const deviceNodeName = '*DEVICE';
const missingValueDatasetToken = '*MISSING_VALUE*';

const nonGeneratedNodes = [
    browserHttpNodeName,
    browserNodeName,
    operatingSystemNodeName,
    deviceNodeName
];

const STRINGIFIED_PREFIX = '*STRINGIFIED*';


const PLUGIN_CHARACTERISTICS_ATTRIBUTES = [
    "plugins",
    "mimeTypes"
];

function isEdge(browserAndVersion) {
    return browserAndVersion.startsWith("edg");
}

async function prepareRecords(records, preprocessingType) {
    let cleanedRecords = [];
    for(let x = 0; x < records.length; x++) {
        let record = records[x];
        let headers = record["requestFingerprint"]["headers"];

        let headersUserAgent = "";
        if("user-agent" in headers) {
            headersUserAgent = headers["user-agent"];
        } else {
            headersUserAgent = headers["User-Agent"];
        }

        record["userAgent"] = headersUserAgent;

        let browserUserAgent = record["browserFingerprint"]["userAgent"];
        if(browserUserAgent == headersUserAgent) {
            cleanedRecords.push(record);
        }
    }


    // TODO this could break if the list is not there anymore
    // The robots list is available under the MIT license, for details see https://github.com/atmire/COUNTER-Robots/blob/master/LICENSE
    let robotUserAgents = await dfd.read_json("https://raw.githubusercontent.com/atmire/COUNTER-Robots/master/COUNTER_Robots_list.json");

    let deconstructedRecords = [];
    let userAgents = new Set();
    for(let x = 0; x < cleanedRecords.length; x++) {
        let record = cleanedRecords[x];
        let userAgent = record["userAgent"];
        let useRecord = !userAgent.match(/(bot|bots|slurp|spider|crawler|crawl)\b/i);
        for(let pattern of robotUserAgents["pattern"].values) {
            useRecord = useRecord && !userAgent.match(new RegExp(pattern, "i"));
        }

        if(useRecord) {
            if(preprocessingType == "headers") {
                const httpVersion = record["requestFingerprint"]["httpVersion"];
                record = record["requestFingerprint"]["headers"];
                record[httpVersionNodeName] = "_" + httpVersion + "_";
                if(record[httpVersionNodeName] == "_1.1_") {
                    useRecord = !("user-agent" in record);
                }
            } else {
                record = record["browserFingerprint"];
            }
        }

        if(useRecord)
            deconstructedRecords.push(record);
        else {
            userAgents.add(userAgent);
        }
    }

    let attributes = new Set();
    for(let record of deconstructedRecords) {
        for(let attribute in record)
            attributes.add(attribute);
    }

    let reorganizedRecords = [];
    for(let record of deconstructedRecords) {
        let reorganizedRecord = {};
        for(let attribute of attributes) {
            if(!(attribute in record) || record[attribute] == undefined) {
                reorganizedRecord[attribute] = missingValueDatasetToken;
            } else {
                reorganizedRecord[attribute] = record[attribute];
            }
        }
        reorganizedRecords.push(reorganizedRecord);
    }

    return reorganizedRecords;
}

class GeneratorNetworksCreator {

    async prepareHeaderGeneratorFiles(datasetPath, resultsPath) {
        /*
            Danfo-js can't read CSVs where field values contain a newline right now, the replace was added to deal with
            issue described in https://github.com/adaltas/node-csv-parse/issues/139
        */
        const datasetText = fs.readFileSync(datasetPath, {encoding:'utf8'}).replace(/^\ufeff/, '');
        let records = await prepareRecords(JSON.parse(datasetText), "headers");

        let inputGeneratorNetwork = new BayesianNetwork(inputNetworkStructure);
        let headerGeneratorNetwork = new BayesianNetwork(headerNetworkStructure);
        let desiredHeaderAttributes = Object.keys(headerGeneratorNetwork.nodesByName).filter((attribute) => !nonGeneratedNodes.includes(attribute));
        let headers = new dfd.DataFrame(records);
        let selectedHeaders = headers.loc({ columns: desiredHeaderAttributes });
        selectedHeaders.fillna({ values: [ missingValueDatasetToken ], inplace: true })
        let browsers = [];
        let operatingSystems = [];
        let devices = [];
        let userAgents = selectedHeaders.loc({ columns: ["user-agent", "User-Agent"] });
        for(const row of userAgents.values) {
            let userAgent = row[0];
            if(userAgent == missingValueDatasetToken) {
                userAgent = row[1];
            }
            userAgent = userAgent.toLowerCase();

            let operatingSystem = missingValueDatasetToken;
            if(/windows/.test(userAgent)) {
                operatingSystem = "windows";
            }
            let device = "desktop";
            if(/phone|android|mobile/.test(userAgent)) {
                device = "mobile";
                if(/iphone|mac/.test(userAgent)) {
                    operatingSystem = "ios";
                } else if(/android/.test(userAgent)) {
                    operatingSystem = "android";
                }
            } else {
                if(/linux/.test(userAgent)) {
                    operatingSystem = "linux";
                } else if(/mac/.test(userAgent)) {
                    operatingSystem = "macos";
                }
            }

            let browser = missingValueDatasetToken;
            let matches = userAgent.match(/(firefox|chrome|safari|edg(a|ios|e)?)\/([0-9.]*)/gi);
            if(matches && !(/OPR\/[0-9.]*/.test(userAgent))) {
                for(let match of matches) {
                    if(isEdge(match)) {
                        browser = "edge/" + match.split("/")[1];
                        break;
                    }
                }
                if(browser == missingValueDatasetToken) {
                    browser = matches[0];
                }
            }

            browsers.push(browser);
            operatingSystems.push(operatingSystem);
            devices.push(device);
        }

        selectedHeaders.addColumn({ "column": browserNodeName, "value": browsers });
        selectedHeaders.addColumn({ "column": operatingSystemNodeName, "value": operatingSystems });
        selectedHeaders.addColumn({ "column": deviceNodeName, "value": devices });

        let browserHttps = [];
        for(let x = 0; x < selectedHeaders.shape[0]; x++) {
            const httpVersion = selectedHeaders[httpVersionNodeName].values[x].startsWith("_1") ? "1" : "2";
            browserHttps.push(selectedHeaders[browserNodeName].values[x] + "|" + httpVersion);
        }
        selectedHeaders.addColumn({ "column": browserHttpNodeName, "value": browserHttps });

        await headerGeneratorNetwork.setProbabilitiesAccordingToData(selectedHeaders);
        await inputGeneratorNetwork.setProbabilitiesAccordingToData(selectedHeaders);

        const inputNetworkDefinitionPath = path.join(resultsPath, "input-network-definition.json");
        const headerNetworkDefinitionPath = path.join(resultsPath, "header-network-definition.json");
        const browserHelperFilePath = path.join(resultsPath, "browser-helper-file.json");

        headerGeneratorNetwork.saveNetworkDefinition(headerNetworkDefinitionPath);
        inputGeneratorNetwork.saveNetworkDefinition(inputNetworkDefinitionPath);

        const uniqueBrowsersAndHttps = await selectedHeaders[browserHttpNodeName].unique().values;
        fs.writeFileSync(browserHelperFilePath, JSON.stringify(uniqueBrowsersAndHttps));
    }

    async prepareFingerprintGeneratorFiles(datasetPath, resultsPath) {
        const datasetText = fs.readFileSync(datasetPath, {encoding:'utf8'}).replace(/^\ufeff/, '');
        let records = await prepareRecords(JSON.parse(datasetText), "fingerprints");
        for(let x = 0; x < records.length; x++) {
            let record = records[x];
            let pluginCharacteristics = {};
            for(let pluginCharacteristicsAttribute of PLUGIN_CHARACTERISTICS_ATTRIBUTES) {
                if(pluginCharacteristicsAttribute in record) {
                    if(record[pluginCharacteristicsAttribute] != "") {
                        pluginCharacteristics[pluginCharacteristicsAttribute] = record[pluginCharacteristicsAttribute];
                    }
                    delete record[pluginCharacteristicsAttribute];
                }
            }

            record["pluginsData"] = pluginCharacteristics != {} ? pluginCharacteristics : missingValueDatasetToken;

            for(const attribute in record) {
                if(record[attribute] === "") {
                    record[attribute] = missingValueDatasetToken;
                } else {
                    record[attribute] = (typeof record[attribute] === 'string' || record[attribute] instanceof String) ? record[attribute] : (STRINGIFIED_PREFIX + JSON.stringify(record[attribute]));
                }
            }

            records[x] = record;
        }

        let fingerprintGeneratorNetwork = new BayesianNetwork(fingerprintNetworkStructure);
        let desiredFingerprintAttributes = Object.keys(fingerprintGeneratorNetwork.nodesByName);
        let fingerprints = new dfd.DataFrame(records);

        let selectedFingerprints = fingerprints.loc({ columns: desiredFingerprintAttributes });
        selectedFingerprints.fillna({ values: [ missingValueDatasetToken ], inplace: true });

        const fingerprintNetworkDefinitionPath = path.join(__dirname, "..", "results", "fingerprint-network-definition.json");

        await fingerprintGeneratorNetwork.setProbabilitiesAccordingToData(selectedFingerprints);
        fingerprintGeneratorNetwork.saveNetworkDefinition(fingerprintNetworkDefinitionPath);
    }

}

module.exports = GeneratorNetworksCreator;
