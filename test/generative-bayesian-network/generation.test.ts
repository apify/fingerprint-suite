/* eslint-disable */
import * as path from 'path';
import { BayesianNetwork } from 'generative-bayesian-network';
import { parse } from 'csv-parse';
import { DataFrame } from 'danfojs-node';
import fs from 'fs';

const testNetworkDefinitionPath = path.join(__dirname, './testNetworkDefinition.zip');

describe.skip('Setup test', () => {

    const testGeneratorNetwork = new BayesianNetwork({path: path.join(__dirname, './testNetworkStructureDefinition.zip')});

    test('Calculates probabilities from data', () => {
        const datasetText = fs.readFileSync(path.join(__dirname, './testDataset.csv'), { encoding: 'utf8' }).replace(/^\ufeff/, '');
        // csv-parse behavior changed, needs fix
        const records = parse(datasetText, {
            columns: true,
            skip_empty_lines: true,
        });
        const dataframe = new DataFrame(records);
        testGeneratorNetwork.setProbabilitiesAccordingToData(dataframe);
        testGeneratorNetwork.saveNetworkDefinition({path: testNetworkDefinitionPath});
        expect(testGeneratorNetwork.generateSample()).toBeTruthy();
    });
});

describe('Generation tests', () => {
    const testGeneratorNetwork = new BayesianNetwork({path: testNetworkDefinitionPath});

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
