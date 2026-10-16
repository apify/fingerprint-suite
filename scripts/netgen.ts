/* eslint-disable @typescript-eslint/no-floating-promises, no-console */
import { GeneratorNetworksCreator } from 'generator-networks-creator';

(async () => {
    const generatorNetworksCreator = new GeneratorNetworksCreator();
    console.log('Preparing browser fingerprints...');
    await generatorNetworksCreator.prepareFingerprintGeneratorFiles(
        `${import.meta.dirname}/dataset.json`,
        `${import.meta.dirname}/../packages/fingerprint-generator/src/data_files`,
    );
    console.log('Preparing browser headers...');
    await generatorNetworksCreator.prepareHeaderGeneratorFiles(
        `${import.meta.dirname}/dataset.json`,
        `${import.meta.dirname}/../packages/header-generator/src/data_files`,
    );
})();
