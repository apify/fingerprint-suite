/* eslint-disable @typescript-eslint/no-floating-promises */
import { GeneratorNetworksCreator } from 'generator-networks-creator';

(async () => {
    const generatorNetworksCreator = new GeneratorNetworksCreator();
    await generatorNetworksCreator.prepareFingerprintGeneratorFiles(
        `${__dirname}/dataset.json`,
        `${__dirname}/../packages/fingerprint-generator/src/data_files`,
    );
    await generatorNetworksCreator.prepareHeaderGeneratorFiles(
        `${__dirname}/dataset.json`,
        `${__dirname}/../packages/header-generator/src/data_files`,
    );
})();
