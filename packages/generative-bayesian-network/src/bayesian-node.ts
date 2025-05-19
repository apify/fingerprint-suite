import { RecordList } from './bayesian-network';

/**
 * Calculates relative frequencies of values of specific attribute from the given data
 * @param dataframe A Danfo.js dataframe containing the data.
 * @param attributeName Attribute name.
 */
function getRelativeFrequencies(
    data: RecordList,
    attributeName: keyof RecordList[number],
) {
    const frequencies: Record<string, number> = {};
    const totalCount = data.length;

    data.forEach((record) => {
        const value = record[attributeName];
        frequencies[value] = (frequencies[value] ?? 0) + 1;
    });

    return Object.fromEntries(
        Object.entries(frequencies).map(([key, value]) => [
            key,
            value / totalCount,
        ]),
    );
}

/**
 * Bayesian network node definition.
 */
interface NodeDefinition {
    /**
     * Name of this node.
     */
    name: string;
    /**
     * Name of the current node's parent nodes.
     */
    parentNames: string[];
    /**
     * Array of possible values for this node.
     */
    possibleValues: string[];
    /**
     * Conditional probabilities for the `possibleValues`, given specified ancestor values.
     */
    conditionalProbabilities: any;
}

/**
 * BayesianNode is an implementation of a single node in a bayesian network allowing sampling from its conditional distribution.
 */
export class BayesianNode {
    private nodeDefinition: NodeDefinition;

    /**
     * @param nodeDefinition Node structure and distributions definition taken from the network definition file.
     */
    constructor(nodeDefinition: NodeDefinition) {
        this.nodeDefinition = nodeDefinition;
    }

    toJSON() {
        return this.nodeDefinition;
    }

    /**
     * Extracts unconditional probabilities of node values given the values of the parent nodes
     * @param parentValues Parent nodes values.
     */
    private getProbabilitiesGivenKnownValues(
        parentValues: Record<string, string> = {},
    ) {
        let probabilities = this.nodeDefinition.conditionalProbabilities;

        for (const parentName of this.parentNames) {
            const parentValue = parentValues[parentName];
            if (parentValue in probabilities.deeper) {
                probabilities = probabilities.deeper[parentValue];
            } else {
                probabilities = probabilities.skip;
            }
        }
        return probabilities;
    }

    /**
     * Randomly samples from the given values using the given probabilities
     * @param possibleValues A list of values to sample from.
     * @param totalProbabilityOfPossibleValues Sum of probabilities of possibleValues in the conditional distribution.
     * @param probabilities A dictionary of probabilities from the conditional distribution, indexed by the values.
     */
    private sampleRandomValueFromPossibilities(
        possibleValues: string[],
        totalProbabilityOfPossibleValues: number,
        probabilities: Record<string, number>,
    ) {
        let chosenValue = possibleValues[0];
        const anchor = Math.random() * totalProbabilityOfPossibleValues;
        let cumulativeProbability = 0;
        for (const possibleValue of possibleValues) {
            cumulativeProbability += probabilities[possibleValue];
            if (cumulativeProbability > anchor) {
                chosenValue = possibleValue;
                break;
            }
        }

        return chosenValue;
    }

    /**
     * Randomly samples from the conditional distribution of this node given values of parents
     * @param parentValues Values of the parent nodes.
     */
    sample(parentValues = {}) {
        const probabilities =
            this.getProbabilitiesGivenKnownValues(parentValues);
        const possibleValues = Object.keys(probabilities);

        return this.sampleRandomValueFromPossibilities(
            possibleValues,
            1.0,
            probabilities,
        );
    }

    /**
     * Randomly samples from the conditional distribution of this node given restrictions on the possible
     * values and the values of the parents.
     * @param parentValues Values of the parent nodes.
     * @param valuePossibilities List of possible values for this node.
     * @param bannedValues What values of this node are banned.
     */
    sampleAccordingToRestrictions(
        parentValues: Record<string, string>,
        valuePossibilities: string[],
        bannedValues: string[],
    ): string | false {
        const probabilities =
            this.getProbabilitiesGivenKnownValues(parentValues);
        let totalProbability = 0.0;
        const validValues = [];
        const valuesInDistribution = Object.keys(probabilities);
        const possibleValues = valuePossibilities || valuesInDistribution;
        for (const value of possibleValues) {
            if (
                !bannedValues.includes(value) &&
                valuesInDistribution.includes(value)
            ) {
                validValues.push(value);
                totalProbability += probabilities[value];
            }
        }

        if (validValues.length === 0) return false;
        return this.sampleRandomValueFromPossibilities(
            validValues,
            totalProbability,
            probabilities,
        );
    }

    /**
     * Sets the conditional probability distribution for this node to match the given data.
     * @param data A RecordList containing the data.
     * @param possibleParentValues A dictionary of lists of possible values for parent nodes.
     */
    setProbabilitiesAccordingToData(
        data: RecordList,
        possibleParentValues: Record<string, string[]> = {},
    ) {
        this.nodeDefinition.possibleValues = Array.from(
            new Set(data.map((record) => record[this.name])),
        );
        this.nodeDefinition.conditionalProbabilities =
            this.recursivelyCalculateConditionalProbabilitiesAccordingToData(
                data,
                possibleParentValues,
                0,
            );
    }

    /**
     * Recursively calculates the conditional probability distribution for this node from the data.
     * @param dataframe A Danfo.js dataframe containing the data.
     * @param possibleParentValues A dictionary of lists of possible values for parent nodes.
     * @param depth Depth of the current recursive call.
     */
    private recursivelyCalculateConditionalProbabilitiesAccordingToData(
        data: RecordList,
        possibleParentValues: Record<string, string[]>,
        depth: number,
    ) {
        let probabilities = {
            deeper: {},
        } as any;

        if (depth < this.parentNames.length) {
            const currentParentName = this.parentNames[depth];
            for (const possibleValue of possibleParentValues[
                currentParentName
            ]) {
                const skip = !data
                    .map((record) => record[currentParentName])
                    .includes(possibleValue);
                let filteredData = data;
                if (!skip) {
                    filteredData = data.filter(
                        (record) => record[currentParentName] === possibleValue,
                    );
                }
                const nextLevel =
                    this.recursivelyCalculateConditionalProbabilitiesAccordingToData(
                        filteredData,
                        possibleParentValues,
                        depth + 1,
                    );

                if (!skip) {
                    probabilities.deeper[possibleValue] = nextLevel;
                } else {
                    probabilities.skip = nextLevel;
                }
            }
        } else {
            probabilities = getRelativeFrequencies(data, this.name);
        }

        return probabilities;
    }

    get name(): string {
        return this.nodeDefinition.name;
    }

    get parentNames(): string[] {
        return this.nodeDefinition.parentNames;
    }

    get possibleValues(): string[] {
        return this.nodeDefinition.possibleValues;
    }
}
