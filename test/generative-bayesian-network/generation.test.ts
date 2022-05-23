/* eslint-disable */
import * as path from 'path';
import BayesianNetwork from 'generative-bayesian-network';

const testNetworkStructureDefinition = require('./testNetworkStructureDefinition.json');

const testNetworkDefinitionPath = path.join(__dirname, './testNetworkDefinition.json');

describe.skip('Setup test', () => {
    const dfd = require('danfojs-node');
    const fs = require('fs');
    const parse = require('csv-parse/lib/sync');
    const testGeneratorNetwork = new BayesianNetwork(testNetworkStructureDefinition);

    test('Calculates probabilities from data', () => {
        const datasetText = fs.readFileSync(path.join(__dirname, './testDataset.csv'), { encoding: 'utf8' }).replace(/^\ufeff/, '');
        const records = parse(datasetText, {
            columns: true,
            skip_empty_lines: true,
        });
        const dataframe = new dfd.DataFrame(records);
        testGeneratorNetwork.setProbabilitiesAccordingToData(dataframe);
        testGeneratorNetwork.saveNetworkDefinition(testNetworkDefinitionPath);
        expect(testGeneratorNetwork.generateSample()).toBeTruthy();
    });
});

const testNetworkDefinition = require(testNetworkDefinitionPath);

describe('Generation tests', () => {
    const testGeneratorNetwork = new BayesianNetwork(testNetworkDefinition);

    test('Generates a sample', () => {
        expect(testGeneratorNetwork.generateSample()).toBeTruthy();
    });

    test('Generates a sample consistent with known values', () => {
        const knownValues = {
            ATTR2: 'ATTR2_VAL1',
            ATTR1: 'ATTR1_VAL3',
            ATTR3: 'ATTR3_VAL2',
        };
        const sample = testGeneratorNetwork.generateSample(knownValues);
        for (const attribute of Object.keys(knownValues) as (keyof typeof knownValues)[]) {
            expect((sample as any)[attribute] === knownValues[attribute]).toBeTruthy();
        }
    });

    test('Generates a sample consistent with the provided value restrictions', () => {
        const valuePossibilities = {
            ATTR2: ['ATTR2_VAL1', 'ATTR2_VAL2'],
            ATTR3: ['ATTR3_VAL2', 'ATTR3_VAL3'],
            ATTR5: ['ATTR5_VAL1', 'ATTR5_VAL3'],
        };
        const sample = testGeneratorNetwork.generateConsistentSampleWhenPossible(valuePossibilities);
        for (const attribute of Object.keys(sample)) {
            if (attribute in valuePossibilities) {
                expect(valuePossibilities[attribute as keyof typeof valuePossibilities].includes(sample[attribute])).toBeTruthy();
            }
        }
    });
});
