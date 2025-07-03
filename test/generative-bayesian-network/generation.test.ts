/* eslint-disable */
import * as path from 'path';
import { BayesianNetwork } from 'generative-bayesian-network';
import { parseFile } from 'fast-csv';

import { describe, expect, test } from 'vitest';

const testNetworkDefinitionPath = path.join(
    __dirname,
    './testNetworkDefinition.zip',
);

describe('Setup test', () => {
    const testGeneratorNetwork = new BayesianNetwork({
        path: path.join(__dirname, './testNetworkStructureDefinition.zip'),
    });

    test('Calculates probabilities from data', async () => {
        const rows: string[][] = [];

        await new Promise<void>((res) => {
            parseFile(path.join(__dirname, './testDataset.csv'))
                .on('data', (r) => rows.push(r))
                .on('end', () => {
                    res();
                });
        });

        const data = rows.slice(1).map((r) => {
            const x = {} as Record<string, any>;
            for (let i = 0; i < r.length; i++) {
                x[rows[0][i]] = r[i];
            }
            return x;
        });

        testGeneratorNetwork.setProbabilitiesAccordingToData(data);
        testGeneratorNetwork.saveNetworkDefinition({
            path: testNetworkDefinitionPath,
        });
        expect(testGeneratorNetwork.generateSample()).toBeTruthy();
    });
});

describe('Generation tests', () => {
    const testGeneratorNetwork = new BayesianNetwork({
        path: testNetworkDefinitionPath,
    });

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
        for (const attribute of Object.keys(
            knownValues,
        ) as (keyof typeof knownValues)[]) {
            expect(
                (sample as any)[attribute] === knownValues[attribute],
            ).toBeTruthy();
        }
    });

    test('Generates a sample consistent with the provided value restrictions', () => {
        const valuePossibilities = {
            ATTR2: ['ATTR2_VAL1', 'ATTR2_VAL2'],
            ATTR3: ['ATTR3_VAL2', 'ATTR3_VAL3'],
            ATTR5: ['ATTR5_VAL1', 'ATTR5_VAL3'],
        };
        const sample =
            testGeneratorNetwork.generateConsistentSampleWhenPossible(
                valuePossibilities,
            );
        for (const attribute of Object.keys(sample)) {
            if (attribute in valuePossibilities) {
                expect(
                    valuePossibilities[
                        attribute as keyof typeof valuePossibilities
                    ].includes(sample[attribute]),
                ).toBeTruthy();
            }
        }
    });
});
