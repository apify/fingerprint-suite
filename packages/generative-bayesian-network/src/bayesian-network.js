const fs = require('fs');

const { BayesianNode } = require('./bayesian-node');

/**
 * BayesianNetwork is an implementation of a bayesian network capable of randomly sampling from the distribution
 * represented by the network.
 */
class BayesianNetwork {
    /**
     * @param {object} networkDefinition - object defining the network structure and distributions
     */
    constructor(networkDefinition) {
        this.nodesInSamplingOrder = networkDefinition.nodes.map((nodeDefinition) => new BayesianNode(nodeDefinition));
        this.nodesByName = {};
        for (const node of this.nodesInSamplingOrder) {
            this.nodesByName[node.name] = node;
        }
    }

    /**
     * Randomly samples from the distribution represented by the bayesian network.
     * @param {object} inputValues - node values that are known already
     */
    generateSample(inputValues = {}) {
        const sample = inputValues;
        for (const node of this.nodesInSamplingOrder) {
            if (!(node.name in sample)) {
                sample[node.name] = node.sample(sample);
            }
        }

        return sample;
    }

    /**
     * Randomly samples from the distribution represented by the bayesian network,
     * making sure the sample is consistent with the provided restrictions on value possibilities.
     * Returns false if no such sample can be generated.
     * @param {object} valuePossibilities - a dictionary of lists of possible values for nodes
     *                                      (if a node isn't present in the dictionary, all values are possible)
     */
    generateConsistentSampleWhenPossible(valuePossibilities) {
        return this._recursivelyGenerateConsistentSampleWhenPossible({}, valuePossibilities, 0);
    }

    /**
     * Recursively generates a random sample consistent with the given restrictions on possible values.
     * @param {object} sampleSoFar - node values that are known already
     * @param {object} valuePossibilities - a dictionary of lists of possible values for nodes
     *                                      (if a node isn't present in the dictionary, all values are possible)
     * @param {number} depth - in what depth of the recursion this function call is,
     *                         specifies what node this function call is sampling
     * @private
     */
    _recursivelyGenerateConsistentSampleWhenPossible(sampleSoFar, valuePossibilities, depth) {
        const bannedValues = [];
        const node = this.nodesInSamplingOrder[depth];

        let sampleValue;
        do {
            sampleValue = node.sampleAccordingToRestrictions(sampleSoFar, valuePossibilities[node.name], bannedValues);

            if (!sampleValue) break;

            sampleSoFar[node.name] = sampleValue;

            if (depth + 1 < this.nodesInSamplingOrder.length) {
                const sample = this._recursivelyGenerateConsistentSampleWhenPossible(sampleSoFar, valuePossibilities, depth + 1);
                if (sample) {
                    return sample;
                }
            } else {
                return sampleSoFar;
            }

            bannedValues.push(sampleValue);
        } while (sampleValue);

        return false;
    }

    /**
     * Sets the conditional probability distributions of this network's nodes to match the given data.
     * @param {object} dataframe - a Danfo.js dataframe containing the data
     */
    setProbabilitiesAccordingToData(dataframe) {
        this.nodesInSamplingOrder.forEach((node) => {
            const possibleParentValues = {};
            for (const parentName of node.parentNames) {
                possibleParentValues[parentName] = this.nodesByName[parentName].possibleValues;
            }
            node.setProbabilitiesAccordingToData(dataframe, possibleParentValues);
        });
    }

    /**
     * Saves the network definition to the specified file path to be used later.
     * @param {string} networkDefinitionFilePath - a file path where the network definition should be saved
     */
    saveNetworkDefinition(networkDefinitionFilePath) {
        const network = {
            nodes: this.nodesInSamplingOrder.map((node) => node.nodeDefinition),
        };

        fs.writeFileSync(networkDefinitionFilePath, JSON.stringify(network));
    }
}

module.exports = {
    BayesianNetwork,
};
