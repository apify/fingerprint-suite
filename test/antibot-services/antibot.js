const { chromium } = require('playwright');
const {
    FingerprintGenerator,
} = require('../../packages/fingerprint-generator/dist/index.mjs');
const {
    FingerprintInjector,
} = require('../../packages/fingerprint-injector/dist/index.mjs');

const services = [
    {
        name: 'botd',
        f: async (page) => {
            await page.goto('https://fingerprintjs.github.io/BotD/');
            await page.waitForTimeout(5000);

            const results = await page.$$('#result-table tr td:nth-child(2)');
            const resultTexts = await Promise.all(
                results.map((x) => x.textContent()),
            );

            const score =
                (resultTexts.length -
                    resultTexts.filter((x) => x === 'not detected').length) /
                resultTexts.length;

            return String.fromCharCode('A'.charCodeAt() + 5 * score);
        },
    },
    {
        name: 'creepjs',
        f: async (page) => {
            await page.goto('https://abrahamjuliot.github.io/creepjs/');
            await page.waitForTimeout(5000);

            const result = await page.$('[class*=grade]');
            const resultScore = await result.textContent();

            return resultScore[0];
        },
    },
];

const service = process.argv[2];

if (!services.find((x) => x.name === service))
    throw new Error(
        `Support for the selected service '${service}' is not (yet) implemented.`,
    );

(async () => {
    const b = await chromium.launch({ headless: false });
    const ctx = await b.newContext();

    const fingerprintGenerator = new FingerprintGenerator();
    const fingerprintInjector = new FingerprintInjector();

    const fingerprint = fingerprintGenerator.getFingerprint({
        locales: ['cs-CZ'],
        operatingSystems: ['linux'],
    });
    await fingerprintInjector.attachFingerprintToPlaywright(ctx, fingerprint);

    const page = await ctx.newPage();

    const { f } = services.find((s) => s.name === service);
    process.stdout.write(await f(page));

    await b.close();
})();
