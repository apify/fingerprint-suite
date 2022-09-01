import { BayesianNetwork } from 'generative-bayesian-network';
import ow from 'ow';
import { readFileSync } from 'fs';
import {
    getBrowser,
    getUserAgent,
    getBrowsersFromQuery,
    shuffleArray,
} from './utils';

import {
    SUPPORTED_BROWSERS,
    BROWSER_HTTP_NODE_NAME,
    MISSING_VALUE_DATASET_TOKEN,
    OPERATING_SYSTEM_NODE_NAME,
    DEVICE_NODE_NAME,
    SUPPORTED_OPERATING_SYSTEMS,
    SUPPORTED_DEVICES,
    SUPPORTED_HTTP_VERSIONS,
    HTTP1_SEC_FETCH_ATTRIBUTES,
    HTTP2_SEC_FETCH_ATTRIBUTES,
} from './constants';

const browserSpecificationShape = {
    name: ow.string,
    minVersion: ow.optional.number,
    maxVersion: ow.optional.number,
    httpVersion: ow.optional.string,
};

export const headerGeneratorOptionsShape = {
    browsers: ow.optional.array.ofType(ow.any(ow.object.exactShape(browserSpecificationShape), ow.string)),
    operatingSystems: ow.optional.array.ofType(ow.string),
    devices: ow.optional.array.ofType(ow.string),
    locales: ow.optional.array.ofType(ow.string),
    httpVersion: ow.optional.string,
    browserListQuery: ow.optional.string,
};

/**
 * String specifying the HTTP version to use.
 */
export type HttpVersion = typeof SUPPORTED_HTTP_VERSIONS[number];

/**
 * String specifying the device type to use.
 */
export type Device = typeof SUPPORTED_DEVICES[number];

/**
 * String specifying the operating system to use.
 */
export type OperatingSystem = typeof SUPPORTED_OPERATING_SYSTEMS[number];

/**
 * String specifying the browser to use.
 */
export type BrowserName = typeof SUPPORTED_BROWSERS[number];

export interface BrowserSpecification {
    /**
    * String representing the browser name.
    */
    name: BrowserName;
    /**
    * Minimum version of browser used.
    */
    minVersion?: number;
    /**
    * Maximum version of browser used.
    */
    maxVersion?: number;
    /**
    * HTTP version to be used for header generation (the headers differ depending on the version).
    * If not specified, the `httpVersion` specified in `HeaderGeneratorOptions` is used.
    */
    httpVersion?: HttpVersion;
}

export type BrowsersType = BrowserSpecification[] | BrowserName[];

/**
 * Options for the `HeaderGenerator` class constructor.
 */
export interface HeaderGeneratorOptions {
    /**
    * List of BrowserSpecifications to generate the headers for,
    * or one of `chrome`, `edge`, `firefox` and `safari`.
    */
    browsers: BrowsersType;
    /**
    * Browser generation query based on the real world data.
    *  For more info see the [query docs](https://github.com/browserslist/browserslist#full-list).
    *  If `browserListQuery` is passed the `browsers` array is ignored.
    */
    browserListQuery: string;
    /**
    * List of operating systems to generate the headers for.
    */
    operatingSystems: OperatingSystem[];
    /**
    * List of devices to generate the headers for.
    */
    devices: Device[];
    /**
    * List of at most 10 languages to include in the
    *  [Accept-Language](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language) request header
    *  in the language format accepted by that header, for example `en`, `en-US` or `de`.
    */
    locales: string[];
    /**
    * Http version to be used to generate headers (the headers differ depending on the version).
    *  Can be either 1 or 2. Default value is 2.
    */
    httpVersion: HttpVersion;
}

/**
 * Structured information about a browser and HTTP version used.
 */
export interface HttpBrowserObject {
    /**
     * Name of the browser used.
     */
    name: BrowserName | typeof MISSING_VALUE_DATASET_TOKEN;
    /**
     * Browser version split into parts of the semantic version number.
     */
    version: number[];
    /**
     * String containing the browser name, browser version and HTTP version (e.g. `chrome/88.0.4324.182|2`).
     */
    completeString: string;
    /**
     * HTTP version as a string ("1" or "2").
     */
    httpVersion: HttpVersion;
};

export type Headers = Record<string, string>;

/**
* Randomly generates realistic HTTP headers based on specified options.
*/
export class HeaderGenerator {
    globalOptions: HeaderGeneratorOptions;

    browserListQuery: string | undefined;

    private inputGeneratorNetwork: any;

    private headerGeneratorNetwork: any;

    private uniqueBrowsers: HttpBrowserObject[];

    private headersOrder: string[];

    /**
    * @param options Default header generation options used - unless overridden.
    */
    constructor(options: Partial<HeaderGeneratorOptions> = {}) {
        ow(options, 'HeaderGeneratorOptions', ow.object.exactShape(headerGeneratorOptionsShape));
        // Use a default setup when the necessary values are not provided
        const {
            browsers = SUPPORTED_BROWSERS,
            operatingSystems = SUPPORTED_OPERATING_SYSTEMS as unknown as OperatingSystem[],
            devices = [SUPPORTED_DEVICES[0]],
            locales = ['en-US'],
            httpVersion = '2',
            browserListQuery = '',
        } = options;
        this.globalOptions = {
            browsers: this._prepareBrowsersConfig(browsers as BrowsersType, browserListQuery, httpVersion),
            operatingSystems,
            devices,
            locales,
            httpVersion,
            browserListQuery,
        };
        this.uniqueBrowsers = [];

        this.headersOrder = JSON.parse(readFileSync(`${__dirname}/data_files/headers-order.json`).toString());
        const uniqueBrowserStrings = JSON.parse(readFileSync(`${__dirname}/data_files/browser-helper-file.json`, 'utf8').toString());

        for (const browserString of uniqueBrowserStrings) {
            // There are headers without user agents in the datasets we used to configure the generator. They should be disregarded.
            if (browserString !== MISSING_VALUE_DATASET_TOKEN) {
                this.uniqueBrowsers.push(this.prepareHttpBrowserObject(browserString));
            }
        }

        this.inputGeneratorNetwork = new BayesianNetwork({ path: `${__dirname}/data_files/input-network-definition.zip` });
        this.headerGeneratorNetwork = new BayesianNetwork({ path: `${__dirname}/data_files/header-network-definition.zip` });
    }

    /**
    * Generates a single set of ordered headers using a combination of the default options specified in the constructor
    * and their possible overrides provided here.
    * @param options Specifies options that should be overridden for this one call.
    * @param requestDependentHeaders Specifies known values of headers dependent on the particular request.
    */
    getHeaders(options: Partial<HeaderGeneratorOptions> = {}, requestDependentHeaders: Headers = {}): Headers {
        ow(options, 'HeaderGeneratorOptions', ow.object.exactShape(headerGeneratorOptionsShape));
        const headerOptions = { ...this.globalOptions, ...options };
        const possibleAttributeValues = this._getPossibleAttributeValues(headerOptions);

        // Generate a sample of input attributes consistent with the data used to create the definition files if possible.
        const inputSample = this.inputGeneratorNetwork.generateConsistentSampleWhenPossible(possibleAttributeValues);

        if (Object.keys(inputSample).length === 0) {
            throw new Error('No headers based on this input can be generated. Please relax or change some of the requirements you specified.');
        }

        // Generate the actual headers
        const generatedSample = this.headerGeneratorNetwork.generateSample(inputSample);

        // Manually fill the accept-language header with random ordering of the locales from input
        const generatedHttpAndBrowser = this.prepareHttpBrowserObject(generatedSample[BROWSER_HTTP_NODE_NAME]);
        let secFetchAttributeNames: typeof HTTP2_SEC_FETCH_ATTRIBUTES | typeof HTTP1_SEC_FETCH_ATTRIBUTES = HTTP2_SEC_FETCH_ATTRIBUTES;
        let acceptLanguageFieldName = 'accept-language';
        if (generatedHttpAndBrowser.httpVersion !== '2') {
            acceptLanguageFieldName = 'Accept-Language';
            secFetchAttributeNames = HTTP1_SEC_FETCH_ATTRIBUTES;
        }

        generatedSample[acceptLanguageFieldName] = this._getAcceptLanguageField(headerOptions.locales);

        const isChrome = generatedHttpAndBrowser.name === 'chrome';
        const isFirefox = generatedHttpAndBrowser.name === 'firefox';
        const isEdge = generatedHttpAndBrowser.name === 'edge';

        const hasSecFetch = (isChrome && generatedHttpAndBrowser.version[0] >= 76)
        || (isFirefox && generatedHttpAndBrowser.version[0] >= 90)
        || (isEdge && generatedHttpAndBrowser.version[0] >= 79);

        // Add fixed headers if needed
        if (hasSecFetch) {
            generatedSample[secFetchAttributeNames.site] = 'same-site';
            generatedSample[secFetchAttributeNames.mode] = 'navigate';
            generatedSample[secFetchAttributeNames.user] = '?1';
            generatedSample[secFetchAttributeNames.dest] = 'document';
        }

        for (const attribute of Object.keys(generatedSample)) {
            if (attribute.startsWith('*') || generatedSample[attribute] === MISSING_VALUE_DATASET_TOKEN) delete generatedSample[attribute];
        }

        // Order the headers in an order depending on the browser
        return this.orderHeaders({
            ...generatedSample,
            ...requestDependentHeaders,
        }, (this.headersOrder as Record<string, any>)[generatedHttpAndBrowser.name]);
    }

    /**
    * Returns a new object that contains ordered headers.
    * @param headers Specifies known values of headers dependent on the particular request.
    * @param order An array of ordered header names, optional (will be deducted from `user-agent`).
    */
    orderHeaders(headers: Headers, order = this.getOrderFromUserAgent(headers)): Headers {
        const orderedSample: Headers = {};

        for (const attribute of order) {
            if (attribute in headers) {
                orderedSample[attribute] = headers[attribute];
            }
        }

        for (const attribute of Object.keys(headers)) {
            if (!order.includes(attribute)) {
                orderedSample[attribute] = headers[attribute];
            }
        }

        return orderedSample;
    }

    private _prepareBrowsersConfig(
        browsers?: BrowsersType,
        browserListQuery?: string,
        httpVersion?: HttpVersion,
    ): BrowserSpecification[] {
        let finalBrowsers = browsers;

        if (browserListQuery) {
            finalBrowsers = getBrowsersFromQuery(browserListQuery);
        }

        return finalBrowsers!.map((browser) => {
            if (typeof browser === 'string') {
                return { name: browser, httpVersion };
            }

            browser.httpVersion = httpVersion;
            return browser;
        });
    }

    private _getBrowserHttpOptions(browsers: BrowserSpecification[]): string[] {
        const browserHttpOptions = [];
        for (const browser of browsers) {
            for (const browserOption of this.uniqueBrowsers) {
                if (browser.name === browserOption.name) {
                    if ((!browser.minVersion || this._browserVersionIsLesserOrEquals([browser.minVersion], browserOption.version))
                        && (!browser.maxVersion || this._browserVersionIsLesserOrEquals(browserOption.version, [browser.maxVersion]))
                        && browser.httpVersion === browserOption.httpVersion) {
                        browserHttpOptions.push(browserOption.completeString);
                    }
                }
            }
        }

        return browserHttpOptions;
    }

    private _getPossibleAttributeValues(headerOptions: Partial<HeaderGeneratorOptions>): Record<string, any> {
        const { browsers: optionsBrowser, browserListQuery, httpVersion, operatingSystems } = headerOptions;
        const browsers = this._prepareBrowsersConfig(optionsBrowser, browserListQuery, httpVersion);

        // Find known browsers compatible with the input
        const browserHttpOptions = this._getBrowserHttpOptions(browsers);
        const possibleAttributeValues: Record<string, any> = {};

        possibleAttributeValues[BROWSER_HTTP_NODE_NAME] = browserHttpOptions;

        possibleAttributeValues[OPERATING_SYSTEM_NODE_NAME] = operatingSystems;

        if (headerOptions.devices) {
            possibleAttributeValues[DEVICE_NODE_NAME] = headerOptions.devices;
        }

        return possibleAttributeValues;
    }

    private _getAcceptLanguageField(localesFromOptions: HeaderGeneratorOptions['locales']): string {
        let locales = localesFromOptions;
        let highLevelLocales = [];
        for (const locale of locales) {
            if (!locale.includes('-')) {
                highLevelLocales.push(locale);
            }
        }

        for (const locale of locales) {
            if (!highLevelLocales.includes(locale)) {
                let highLevelEquivalentPresent = false;
                for (const highLevelLocale of highLevelLocales) {
                    if (locale.includes(highLevelLocale)) {
                        highLevelEquivalentPresent = true;
                        break;
                    }
                }
                if (!highLevelEquivalentPresent) highLevelLocales.push(locale);
            }
        }

        highLevelLocales = shuffleArray(highLevelLocales);
        locales = shuffleArray(locales);

        const localesInAddingOrder = [];

        for (const highLevelLocale of highLevelLocales) {
            for (const locale of locales) {
                if (locale.includes(highLevelLocale) && !highLevelLocales.includes(locale)) {
                    localesInAddingOrder.push(locale);
                }
            }
            localesInAddingOrder.push(highLevelLocale);
        }

        let acceptLanguageFieldValue = localesInAddingOrder[0];

        for (let x = 1; x < localesInAddingOrder.length; x++) {
            acceptLanguageFieldValue += `,${localesInAddingOrder[x]};q=${1 - x * 0.1}`;
        }
        return acceptLanguageFieldValue;
    }

    /**
    * Extract structured information about a browser and http version in the form of an object from httpBrowserString.
    * @param httpBrowserString A string containing the browser name, version and http version, such as `chrome/88.0.4324.182|2`.
    */
    private prepareHttpBrowserObject(httpBrowserString: string): HttpBrowserObject {
        const [browserString, httpVersion] = httpBrowserString.split('|');
        let browserObject;

        if (browserString === MISSING_VALUE_DATASET_TOKEN) {
            browserObject = { name: MISSING_VALUE_DATASET_TOKEN };
        } else {
            browserObject = this.prepareBrowserObject(browserString);
        }

        return {
            ...browserObject,
            httpVersion: httpVersion as HeaderGeneratorOptions['httpVersion'],
            completeString: httpBrowserString,
        } as HttpBrowserObject;
    }

    /**
     * Extract structured information about a browser in the form of an object from browserString.
     * @param browserString A string containing the browser name and version, e.g. `chrome/88.0.4324.182`.
     */
    private prepareBrowserObject(browserString: string): HttpBrowserObject {
        const nameVersionSplit = browserString.split('/');
        const versionSplit = nameVersionSplit[1].split('.');
        const preparedVersion = [];
        for (const versionPart of versionSplit) {
            preparedVersion.push(parseInt(versionPart, 10));
        }

        return {
            name: nameVersionSplit[0],
            version: preparedVersion,
            completeString: browserString,
        } as HttpBrowserObject;
    }

    /**
     * Returns a new object containing header names ordered by their appearance in the given browser.
     * @param headers Non-normalized request headers
     * @returns Correct header order for the given browser.
     */
    private getOrderFromUserAgent(headers: Record<string, string>) : string[] {
        const userAgent = getUserAgent(headers);
        const browser = getBrowser(userAgent);

        if (!browser) {
            return [];
        }

        return (this.headersOrder as Record<string, any>)[browser];
    }

    private _browserVersionIsLesserOrEquals(browserVersionL: number[], browserVersionR: number[]) {
        return browserVersionL[0] <= browserVersionR[0];
    }
}
