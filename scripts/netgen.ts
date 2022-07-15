/* eslint-disable @typescript-eslint/no-floating-promises */
import { GeneratorNetworksCreator } from 'generator-networks-creator';
import { readFileSync, writeFileSync } from 'fs';

(async () => {
    const generatorNetworksCreator = new GeneratorNetworksCreator();

    const fingerprintDataset = JSON.parse(readFileSync(`${__dirname}/dataset.json`).toString());

    writeFileSync(`${__dirname}/dataset.json`,
        JSON.stringify(
            fingerprintDataset.filter(
                (f:any) => f.browserFingerprint.screen.width >= 1280
                    || f.browserFingerprint.screen.width < f.browserFingerprint.screen.height),
        ),
    );

    await generatorNetworksCreator.prepareFingerprintGeneratorFiles(
        `${__dirname}/dataset.json`,
        `${__dirname}/../packages/fingerprint-generator/src/data_files`,
    );
    await generatorNetworksCreator.prepareHeaderGeneratorFiles(
        `${__dirname}/dataset.json`,
        `${__dirname}/../packages/header-generator/src/data_files`,
    );
})();
