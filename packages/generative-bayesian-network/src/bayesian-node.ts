import { DataFrame, Series } from 'danfojs-node';

/**
* Calculates relative frequencies of values of specific attribute from the given data
* @param dataframe A Danfo.js dataframe containing the data.
* @param attributeName Attribute name.
*/
function getRelativeFrequencies(dataframe: DataFrame, attributeName: string) {
    const frequencies : Record<string, number> = {};
    const totalCount = dataframe.shape[0];
    const valueCounts = new Series(dataframe[attributeName]).valueCounts();

    for (let index = 0; index < valueCounts.index.length; index++) {
        frequencies[valueCounts.index[index]] = (valueCounts.values[index] as number) / totalCount;
    }

    return frequencies;
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
    private getProbabilitiesGivenKnownValues(parentValues: Record<string, string> = {}) {
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
    private sampleRandomValueFromPossibilities(possibleValues: string[], totalProbabilityOfPossibleValues: number, probabilities: Record<string, number>) {
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
        const probabilities = this.getProbabilitiesGivenKnownValues(parentValues);
        const possibleValues = Object.keys(probabilities);

        return this.sampleRandomValueFromPossibilities(possibleValues, 1.0, probabilities);
    }

    /**
     * Randomly samples from the conditional distribution of this node given restrictions on the possible
     * values and the values of the parents.
     * @param parentValues Values of the parent nodes.
     * @param valuePossibilities List of possible values for this node.
     * @param bannedValues What values of this node are banned.
     */
    sampleAccordingToRestrictions(parentValues: Record<string, string>, valuePossibilities: string[], bannedValues: string[]) : string | false {
        const probabilities = this.getProbabilitiesGivenKnownValues(parentValues);
        let totalProbability = 0.0;
        const validValues = [];
        const valuesInDistribution = Object.keys(probabilities);
        const possibleValues = valuePossibilities || valuesInDistribution;
        for (const value of possibleValues) {
            if (!bannedValues.includes(value) && valuesInDistribution.includes(value)) {
                validValues.push(value);
                totalProbability += probabilities[value];
            }
        }

        if (validValues.length === 0) return false;
        return this.sampleRandomValueFromPossibilities(validValues, totalProbability, probabilities);
    }

    /**
     * Sets the conditional probability distribution for this node to match the given data.
     * @param dataframe A Danfo.js dataframe containing the data.
     * @param possibleParentValues A dictionary of lists of possible values for parent nodes.
     */
    setProbabilitiesAccordingToData(dataframe: DataFrame, possibleParentValues: Record<string, string[]> = {}) {
        this.nodeDefinition.possibleValues = dataframe[this.name].unique().values;
        this.nodeDefinition.conditionalProbabilities = this.recursivelyCalculateConditionalProbabilitiesAccordingToData(
            dataframe,
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
    private recursivelyCalculateConditionalProbabilitiesAccordingToData(dataframe: DataFrame, possibleParentValues: Record<string, string[]>, depth: number) {
        let probabilities = {
            deeper: {},
        } as any;

        if (depth < this.parentNames.length) {
            const currentParentName = this.parentNames[depth];
            for (const possibleValue of possibleParentValues[currentParentName]) {
                const skip = !dataframe[currentParentName].unique().values.includes(possibleValue);
                let filteredDataframe = dataframe;
                if (!skip) {
                    filteredDataframe = dataframe.query(dataframe[currentParentName].eq(possibleValue)) as DataFrame;
                }
                const nextLevel = this.recursivelyCalculateConditionalProbabilitiesAccordingToData(
                    filteredDataframe,
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
            probabilities = getRelativeFrequencies(dataframe, this.name);
        }

        return probabilities;
    }

    get name() : string {
        return this.nodeDefinition.name;
    }

    get parentNames() : string[] {
        return this.nodeDefinition.parentNames;
    }

    get possibleValues() : string[] {
        return this.nodeDefinition.possibleValues;
    }
}
