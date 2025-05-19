import type { BayesianNetwork } from './bayesian-network';

/**
 * Performs a set "intersection" on the given (flat) arrays.
 */
export function arrayIntersection<T>(a: T[], b: T[]): T[] {
    return a.filter((x) => b.includes(x));
}

/**
 * Performs a set "union" operation on two (flat) arrays.
 */
export function arrayUnion<T>(a: T[], b: T[]): T[] {
    return [...a, ...b.filter((x) => !a.includes(x))];
}

/**
 * Combines two arrays into a single array using the _combiner_ function.
 * @param a First array to be combined.
 * @param b Second array to be combined.
 * @param f Combiner function. It receives the current element from the first array and the current element from the second array.
 * @returns Zipped (multi-dimensional) array.
 */
export function arrayZip<T>(
    a: T[][],
    b: T[][],
    f: (aEl: T[], bEl: T[]) => T[],
): T[][] {
    return a.map((x, i) => f(x, b[i]));
}
/**
 * Given a `generative-bayesian-network` instance and a set of user constraints, returns an extended
 * set of constraints **induced** by the original constraints and network structure.
 * @param {*} network
 * @param {*} possibleValues
 * @returns
 */
export function getConstraintClosure(
    network: BayesianNetwork,
    possibleValues: Record<string, string[]>,
) {
    /**
     * Removes the "deeper/skip" stuctures from the conditional probability table.
     */
    function undeeper(obj: Record<string, any>) {
        if (typeof obj !== 'object' || obj === null) return obj;

        const result: Record<string, any> = {};
        for (const key of Object.keys(obj)) {
            if (key === 'skip') continue;
            if (key === 'deeper') {
                Object.assign(result, undeeper(obj[key]));
                continue;
            }
            result[key] = undeeper(obj[key]);
        }
        return result;
    }

    /**
     * Performs DFS on the Tree and returns values of the nodes on the paths that end with the given keys (stored by levels - first level is the root)
     * ```
     *        1
     *      /   \
     *     2      3
     *    / \    / \
     *   4  5    6  7
     * ```
     *  ```filterByLastLevelKeys(tree, ['4', '7']) => [[1], [2,3]]```
     *
     * @param {*} tree Tree is a nested object.
     * @param {*} validKeys Array of last-level keys that we are interested in.
     * @returns Keys on the paths that end with the given keys.
     */
    function filterByLastLevelKeys(
        tree: Record<string, any>,
        validKeys: string[],
    ) {
        let foundPaths: string[][] = [];
        const dfs = (t: Record<string, any>, acc: string[]) => {
            for (const key of Object.keys(t)) {
                if (typeof t[key] !== 'object' || !t[key]) {
                    if (validKeys.includes(key)) {
                        foundPaths =
                            foundPaths.length === 0
                                ? acc.map((x) => [x])
                                : arrayZip(
                                      foundPaths,
                                      acc.map((x) => [x]),
                                      (a, b) => [...new Set([...a, ...b])],
                                  );
                    }
                    continue;
                } else {
                    dfs(t[key], [...acc, key]);
                }
            }
        };
        dfs(tree, []);
        return foundPaths;
    }

    const sets = [];

    let foundMatchingValues = false;

    // For every pre-specified node, we compute the "closure" for values of the other nodes.
    for (const key of Object.keys(possibleValues)) {
        if (!Array.isArray(possibleValues[key])) continue;
        if (possibleValues[key].length === 0) {
            throw new Error(`The current constraints are too restrictive. 
No possible values can be found for the given constraints.`);
        }
        // eslint-disable-next-line
        const node = network['nodesByName'][key]['nodeDefinition'];
        const tree = undeeper(node.conditionalProbabilities);
        const zippedValues = filterByLastLevelKeys(tree, possibleValues[key]);

        if (zippedValues.length > 0) {
            foundMatchingValues = true;
        }
        sets.push({
            ...Object.fromEntries(
                zippedValues.map((x, i) => [node.parentNames[i], x]),
            ),
            [key]: possibleValues[key],
        });
    }

    if (!foundMatchingValues) {
        return {};
    }

    // We compute the intersection of all the possible values for each node.
    return sets.reduce((acc, x) => {
        for (const key of Object.keys(x)) {
            acc[key] = acc[key] ? arrayIntersection(acc[key], x[key]) : x[key];
            // If the intersection turns out to be empty, we throw an error ().
            if (acc[key].length === 0) {
                throw new Error(`The current constraints are too restrictive. 
No possible values can be found for the given constraints.`);
            }
        }
        return acc;
    }, {});
}
