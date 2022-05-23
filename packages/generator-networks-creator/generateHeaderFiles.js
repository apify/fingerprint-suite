const Apify = require('apify');
const GeneratorNetworksCreator = require("./src/generator-networks-creator.js");

Apify.main(async () => {
    console.log("Generating header generator files");
    const generatorNetworksCreator = new GeneratorNetworksCreator();
    await generatorNetworksCreator.prepareHeaderGeneratorFiles("src/datasets/dataset.json", "results");
    console.log("Done");
});
