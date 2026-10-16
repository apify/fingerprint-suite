import { readFileSync, writeFileSync } from 'node:fs';

import { BayesianNode } from './bayesian-node.js';
import { createZip, readZip } from './zip.js';

export type RecordList = Record<string, any>[];

/**
 * BayesianNetwork is an implementation of a bayesian network capable of randomly sampling from the distribution
 * represented by the network.
 */
export class BayesianNetwork {
    #nodesInSamplingOrder: BayesianNode[] = [];
    #nodesByName: Record<string, BayesianNode> = {};

    /**
     * @param options.path Path (or `file:` URL) of the `.zip` file with the network definition.
     */
    constructor({ path }: { path: string | URL }) {
        const [definition] = readZip(readFileSync(path));

        if (!definition) {
            throw new Error(
                `The network definition ${path} is an empty ZIP archive.`,
            );
        }

        const networkDefinition = JSON.parse(definition.data.toString('utf8'));
        this.#nodesInSamplingOrder = networkDefinition.nodes.map(
            (nodeDefinition: any) => new BayesianNode(nodeDefinition),
        );

        this.#nodesByName = this.#nodesInSamplingOrder.reduce(
            (p, node) => ({
                ...p,
                [node.name]: node,
            }),
            {},
        );
    }

    /**
     * The nodes of this network, indexed by their names.
     */
    get nodesByName(): Readonly<Record<string, BayesianNode>> {
        return this.#nodesByName;
    }

    /**
     * Randomly samples from the distribution represented by the bayesian network.
     * @param inputValues Already known node values.
     */
    generateSample(inputValues: Record<string, string> = {}) {
        const sample = inputValues;
        for (const node of this.#nodesInSamplingOrder) {
            if (!(node.name in sample)) {
                sample[node.name] = node.sample(sample);
            }
        }
        return sample;
    }

    /**
     * Randomly samples values from the distribution represented by the bayesian network,
     * making sure the sample is consistent with the provided restrictions on value possibilities.
     * Returns false if no such sample can be generated.
     * @param valuePossibilities A dictionary of lists of possible values for nodes (if a node isn't present in the dictionary, all values are possible).
     */
    generateConsistentSampleWhenPossible(
        valuePossibilities: Record<string, string[]>,
    ) {
        return this.#recursivelyGenerateConsistentSampleWhenPossible(
            {},
            valuePossibilities,
            0,
        );
    }

    /**
     * Recursively generates a random sample consistent with the given restrictions on possible values.
     * @param sampleSoFar Already known node values.
     * @param valuePossibilities A dictionary of lists of possible values for nodes (if a node isn't present in the dictionary, all values are possible).
     * @param depth Current recursion depth.
     */
    #recursivelyGenerateConsistentSampleWhenPossible(
        sampleSoFar: Record<string, string>,
        valuePossibilities: Record<string, string[]>,
        depth: number,
    ): Record<string, string> {
        const bannedValues: string[] = [];
        const node = this.#nodesInSamplingOrder[depth];
        let sampleValue;

        do {
            sampleValue = node.sampleAccordingToRestrictions(
                sampleSoFar,
                valuePossibilities[node.name],
                bannedValues,
            );
            if (!sampleValue) break;

            sampleSoFar[node.name] = sampleValue;

            if (depth + 1 < this.#nodesInSamplingOrder.length) {
                const sample =
                    this.#recursivelyGenerateConsistentSampleWhenPossible(
                        sampleSoFar,
                        valuePossibilities,
                        depth + 1,
                    );
                if (Object.keys(sample).length !== 0) {
                    return sample;
                }
            } else {
                return sampleSoFar;
            }

            bannedValues.push(sampleValue);
        } while (sampleValue);

        return {};
    }

    /**
     * Sets the conditional probability distributions of this network's nodes to match the given data.
     * @param dataframe A Danfo.js dataframe containing the data.
     */
    setProbabilitiesAccordingToData(data: RecordList) {
        this.#nodesInSamplingOrder.forEach((node, i) => {
            // eslint-disable-next-line no-console
            console.log(
                `${i}/${this.#nodesInSamplingOrder.length} Setting probabilities for node ${node.name}`,
            );
            const possibleParentValues: Record<string, string[]> = {};
            for (const parentName of node.parentNames) {
                possibleParentValues[parentName] =
                    this.#nodesByName[parentName].possibleValues;
            }
            node.setProbabilitiesAccordingToData(data, possibleParentValues);
        });
    }

    /**
     * Saves the network definition to the specified file path to be used later.
     * @param networkDefinitionFilePath File path where the network definition should be saved.
     */
    saveNetworkDefinition({ path }: { path: string | URL }) {
        const network = {
            nodes: this.#nodesInSamplingOrder,
        };

        writeFileSync(
            path,
            createZip([
                {
                    name: 'network.json',
                    data: Buffer.from(JSON.stringify(network), 'utf8'),
                },
            ]),
        );
    }
}
