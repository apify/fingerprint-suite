import type { Browser, BrowserContext } from 'playwright';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';

import { FingeprintingEngine, GetContextOptions } from './vanilla-playwright';

export class PlaywrightExtra implements FingeprintingEngine {
    private browser: Browser | null = null;

    async getContext(options: GetContextOptions): Promise<BrowserContext> {
        const { launchOptions = {}, contextOptions = {} } = options;

        if (!this.browser) {
            chromium.use(stealth());
            this.browser = await chromium.launch(launchOptions);
        }
        return this.browser.newContext(contextOptions);
    }

    getEngineName(): string {
        return 'playwright-extra';
    }
}
