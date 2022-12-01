/* eslint-disable @typescript-eslint/no-floating-promises, no-console */
import { GeneratorNetworksCreator } from 'generator-networks-creator';

(async () => {
    const generatorNetworksCreator = new GeneratorNetworksCreator();
    console.log('Preparing browser fingerprints...');
    await generatorNetworksCreator.prepareFingerprintGeneratorFiles(
        `${__dirname}/dataset.json`,
        `${__dirname}/../packages/fingerprint-generator/src/data_files`,
    );
    console.log('Preparing browser headers...');
    await generatorNetworksCreator.prepareHeaderGeneratorFiles(
        `${__dirname}/dataset.json`,
        `${__dirname}/../packages/header-generator/src/data_files`,
    );
})();
