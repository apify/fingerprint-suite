import { BayesianNetwork, utils } from 'generative-bayesian-network';
import {
    HeaderGenerator,
    HeaderGeneratorOptions,
    Headers,
} from 'header-generator';

import { MISSING_VALUE_DATASET_TOKEN, STRINGIFIED_PREFIX } from './constants';

export type ScreenFingerprint = {
    availHeight: number;
    availWidth: number;
    availTop: number;
    availLeft: number;
    colorDepth: number;
    height: number;
    pixelDepth: number;
    width: number;
    devicePixelRatio: number;
    pageXOffset: number;
    pageYOffset: number;
    innerHeight: number;
    outerHeight: number;
    outerWidth: number;
    innerWidth: number;
    screenX: number;
    clientWidth: number;
    clientHeight: number;
    hasHDR: boolean;
};

export type Brand = {
    brand: string;
    version: string;
};

export type UserAgentData = {
    brands: Brand[];
    mobile: boolean;
    platform: string;
    architecture: string;
    bitness: string;
    fullVersionList: Brand[];
    model: string;
    platformVersion: string;
    uaFullVersion: string;
};

export type ExtraProperties = {
    vendorFlavors: string[];
    isBluetoothSupported: boolean;
    globalPrivacyControl: null;
    pdfViewerEnabled: boolean;
    installedApps: any[];
};

export type NavigatorFingerprint = {
    userAgent: string;
    userAgentData: UserAgentData;
    doNotTrack: string;
    appCodeName: string;
    appName: string;
    appVersion: string;
    oscpu: string;
    webdriver: string;
    language: string;
    languages: string[];
    platform: string;
    deviceMemory?: number; // Firefox does not have deviceMemory available
    hardwareConcurrency: number;
    product: string;
    productSub: string;
    vendor: string;
    vendorSub: string;
    maxTouchPoints?: number;
    extraProperties: ExtraProperties;
};

export type VideoCard = {
    renderer: string;
    vendor: string;
};

export type Fingerprint = {
    screen: ScreenFingerprint;
    navigator: NavigatorFingerprint;
    videoCodecs: Record<string, string>;
    audioCodecs: Record<string, string>;
    pluginsData: Record<string, string>;
    battery?: Record<string, string>;
    videoCard: VideoCard;
    multimediaDevices: string[];
    fonts: string[];
    mockWebRTC: boolean;
    slim?: boolean;
};

export type BrowserFingerprintWithHeaders = {
    headers: Headers;
    fingerprint: Fingerprint;
};
export interface FingerprintGeneratorOptions extends HeaderGeneratorOptions {
    /**
     * Defines the screen dimensions of the generated fingerprint.
     *
     * **Note:** Using this option can lead to a substantial performance drop (~0.0007s/fingerprint -> ~0.03s/fingerprint)
     */
    screen: {
        minWidth?: number;
        maxWidth?: number;
        minHeight?: number;
        maxHeight?: number;
    };
    mockWebRTC?: boolean;
    /**
     * Enables the slim mode for the fingerprint injection.
     * This disables some performance-heavy evasions, but might decrease benchmark scores.
     *
     * Try enabling this if you are experiencing performance issues with the fingerprint injection.
     */
    slim?: boolean;
}

/**
 * Fingerprint generator - Class for realistic browser fingerprint generation.
 */
export class FingerprintGenerator extends HeaderGenerator {
    fingerprintGeneratorNetwork: any;
    fingerprintGlobalOptions: Partial<
        Omit<FingerprintGeneratorOptions, keyof HeaderGeneratorOptions>
    >;

    /**
     * @param options Default header generation options used - unless overridden.
     */
    constructor(options: Partial<FingerprintGeneratorOptions> = {}) {
        super(options);
        this.fingerprintGlobalOptions = {
            screen: options.screen,
            mockWebRTC: options.mockWebRTC,
            slim: options.slim,
        };
        this.fingerprintGeneratorNetwork = new BayesianNetwork({
            path: `${__dirname}/data_files/fingerprint-network-definition.zip`,
        });
    }

    /**
     * Generates a fingerprint and a matching set of ordered headers using a combination of the default options specified in the constructor
     * and their possible overrides provided here.
     * @param options Overrides default `FingerprintGenerator` options.
     * @param requestDependentHeaders Specifies known values of headers dependent on the particular request.
     */
    getFingerprint(
        options: Partial<FingerprintGeneratorOptions> = {},
        requestDependentHeaders: Headers = {},
    ): BrowserFingerprintWithHeaders {
        const filteredValues: Record<string, string[]> = {};

        for (const [key, value] of Object.entries(options)) {
            if (!value) {
                delete options[key as keyof typeof options];
            }
        }

        options = {
            ...this.fingerprintGlobalOptions,
            ...options,
        };

        const partialCSP = (() => {
            const extensiveScreen =
                options.screen && Object.keys(options.screen).length !== 0;
            const shouldUseExtensiveConstraints = extensiveScreen;

            if (!shouldUseExtensiveConstraints) return undefined;

            filteredValues.screen = extensiveScreen
                ? this.fingerprintGeneratorNetwork.nodesByName.screen.possibleValues.filter(
                      (screenString: string) => {
                          const screen = JSON.parse(
                              screenString.split(STRINGIFIED_PREFIX)[1],
                          );
                          return (
                              screen.width >= (options.screen?.minWidth ?? 0) &&
                              screen.width <=
                                  (options.screen?.maxWidth ?? 1e5) &&
                              screen.height >=
                                  (options.screen?.minHeight ?? 0) &&
                              screen.height <=
                                  (options.screen?.maxHeight ?? 1e5)
                          );
                      },
                  )
                : undefined;

            try {
                return utils.getConstraintClosure(
                    this.fingerprintGeneratorNetwork,
                    filteredValues,
                );
            } catch (e) {
                if (options?.strict) throw e;
                delete filteredValues.screen;
                return undefined;
            }
        })();

        for (let generateRetries = 0; generateRetries < 10; generateRetries++) {
            // Generate headers consistent with the inputs to get input-compatible user-agent and accept-language headers needed later
            const headers = super.getHeaders(
                options,
                requestDependentHeaders,
                partialCSP?.userAgent,
            );
            const userAgent =
                'User-Agent' in headers
                    ? headers['User-Agent']
                    : headers['user-agent'];

            // Generate fingerprint consistent with the generated user agent
            const fingerprint: Record<string, any> =
                this.fingerprintGeneratorNetwork.generateConsistentSampleWhenPossible(
                    {
                        ...filteredValues,
                        userAgent: [userAgent],
                    },
                );

            /* Delete any missing attributes and unpack any object/array-like attributes
             * that have been packed together to make the underlying network simpler
             */
            for (const attribute of Object.keys(fingerprint)) {
                if (fingerprint[attribute] === MISSING_VALUE_DATASET_TOKEN) {
                    fingerprint[attribute] = null;
                } else if (
                    fingerprint[attribute].startsWith(STRINGIFIED_PREFIX)
                ) {
                    fingerprint[attribute] = JSON.parse(
                        fingerprint[attribute].slice(STRINGIFIED_PREFIX.length),
                    );
                }
            }

            if (!fingerprint.screen) continue; // fix? sometimes, fingerprints are generated 90% empty/null. This is just a workaround.

            // Manually add the set of accepted languages required by the input
            const acceptLanguageHeaderValue =
                'Accept-Language' in headers
                    ? headers['Accept-Language']
                    : headers['accept-language'];
            const acceptedLanguages = [];
            for (const locale of acceptLanguageHeaderValue.split(',')) {
                acceptedLanguages.push(locale.split(';')[0]);
            }
            fingerprint.languages = acceptedLanguages;

            return {
                fingerprint: {
                    ...this.transformFingerprint(fingerprint),
                    mockWebRTC:
                        options.mockWebRTC ??
                        this.fingerprintGlobalOptions.mockWebRTC ??
                        false,
                    slim:
                        options.slim ??
                        this.fingerprintGlobalOptions.slim ??
                        false,
                },
                headers,
            };
        }

        throw new Error(
            'Failed to generate a consistent fingerprint after 10 attempts',
        );
    }

    /**
     * Transforms fingerprint to the final scheme, more suitable for fingerprint manipulation and injection.
     * This schema is used in the `fingerprint-injector`.
     * @param fingerprint Fingerprint to be transformed.
     * @returns Transformed fingerprint.
     */
    private transformFingerprint(
        fingerprint: Record<string, any>,
    ): Fingerprint {
        const {
            userAgent,
            userAgentData,
            doNotTrack,
            appCodeName,
            appName,
            appVersion,
            oscpu,
            webdriver,
            languages,
            platform,
            deviceMemory,
            hardwareConcurrency,
            product,
            productSub,
            vendor,
            vendorSub,
            maxTouchPoints,
            extraProperties,
            screen,
            pluginsData,
            audioCodecs,
            videoCodecs,
            battery,
            videoCard,
            multimediaDevices,
            fonts,
        } = fingerprint;
        const parsedMemory = parseInt(deviceMemory, 10);
        const parsedTouchPoints = parseInt(maxTouchPoints, 10);

        const navigator = {
            userAgent,
            userAgentData,
            language: languages[0],
            languages,
            platform,
            deviceMemory: Number.isNaN(parsedMemory) ? null : parsedMemory, // Firefox does not have deviceMemory available
            hardwareConcurrency: parseInt(hardwareConcurrency, 10),
            maxTouchPoints: Number.isNaN(parsedTouchPoints)
                ? 0
                : parsedTouchPoints,
            product,
            productSub,
            vendor,
            vendorSub,
            doNotTrack,
            appCodeName,
            appName,
            appVersion,
            oscpu,
            extraProperties,
            webdriver,
        };

        return {
            screen,
            navigator,
            audioCodecs,
            videoCodecs,
            pluginsData,
            battery,
            videoCard,
            multimediaDevices,
            fonts,
        } as Fingerprint;
    }
}
