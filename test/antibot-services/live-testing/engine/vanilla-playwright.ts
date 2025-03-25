import {
    chromium,
    firefox,
    webkit,
    BrowserContext,
    LaunchOptions,
    BrowserContextOptions,
    BrowserType,
    Browser,
} from 'playwright';

export interface GetContextOptions {
    browserType?: 'chromium' | 'firefox' | 'webkit';
    launchOptions?: LaunchOptions;
    contextOptions?: BrowserContextOptions;
}

export interface FingeprintingEngine {
    getContext({
        browserType,
        launchOptions,
        contextOptions,
    }: GetContextOptions): Promise<BrowserContext>;

    getEngineName(): string;
}

export class VanillaPlaywright implements FingeprintingEngine {
    private browser: Browser | null = null;

    async getContext(options: GetContextOptions): Promise<BrowserContext> {
        const {
            browserType = 'chromium',
            launchOptions = {},
            contextOptions = {},
        } = options;

        let browser: BrowserType;
        switch (browserType) {
            case 'chromium':
                browser = chromium;
                break;
            case 'firefox':
                browser = firefox;
                break;
            case 'webkit':
                browser = webkit;
                break;
            default:
                throw new Error(`Unknown browser type: ${browserType}`);
        }

        this.browser ??= await browser.launch(launchOptions);
        return this.browser.newContext(contextOptions);
    }

    getEngineName(): string {
        return 'vanilla-playwright';
    }
}
