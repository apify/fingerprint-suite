import fs from 'fs';
import path from 'path';
import { z } from 'zod';

import { BayesianNetwork } from 'generative-bayesian-network';
import fetch from 'node-fetch';
import { UAParser } from 'ua-parser-js';

const browserHttpNodeName = '*BROWSER_HTTP';
const httpVersionNodeName = '*HTTP_VERSION';
const browserNodeName = '*BROWSER';
const operatingSystemNodeName = '*OPERATING_SYSTEM';
const deviceNodeName = '*DEVICE';
const missingValueDatasetToken = '*MISSING_VALUE*';

const nonGeneratedNodes = [
    browserHttpNodeName,
    browserNodeName,
    operatingSystemNodeName,
    deviceNodeName,
];

const STRINGIFIED_PREFIX = '*STRINGIFIED*';

const PLUGIN_CHARACTERISTICS_ATTRIBUTES = ['plugins', 'mimeTypes'];

const KNOWN_WEBGL_RENDERER_PARTS = [
    'AMD',
    'ANGLE',
    'ASUS',
    'ATI',
    'ATI Radeon',
    'ATI Technologies Inc',
    'Adreno',
    'Android Emulator',
    'Apple',
    'Apple GPU',
    'Apple M1',
    'Chipset',
    'D3D11',
    'Direct3D',
    'Express Chipset',
    'GeForce',
    'Generation',
    'Generic Renderer',
    'Google',
    'Google SwiftShader',
    'Graphics',
    'Graphics Media Accelerator',
    'HD Graphics Family',
    'Intel',
    'Intel(R) HD Graphics',
    'Intel(R) UHD Graphics',
    'Iris',
    'KBL Graphics',
    'Mali',
    'Mesa',
    'Mesa DRI',
    'Metal',
    'Microsoft',
    'Microsoft Basic Render Driver',
    'Microsoft Corporation',
    'NVIDIA',
    'NVIDIA Corporation',
    'NVIDIAGameReadyD3D',
    'OpenGL',
    'OpenGL Engine',
    'Open Source Technology Center',
    'Parallels',
    'Parallels Display Adapter',
    'PCIe',
    'Plus Graphics',
    'PowerVR',
    'Pro Graphics',
    'Quadro',
    'Radeon',
    'Radeon Pro',
    'Radeon Pro Vega',
    'Samsung',
    'SSE2',
    'VMware',
    'VMware SVGA 3D',
    'Vega',
    'VirtualBox',
    'VirtualBox Graphics Adapter',
    'Vulkan',
    'Xe Graphics',
    'llvmpipe',
];

const KNOWN_OS_FONTS = {
    WINDOWS: [
        'Cambria Math',
        'Nirmala UI',
        'Leelawadee UI',
        'HoloLens MDL2 Assets',
        'Segoe Fluent Icons',
    ],
    APPLE: [
        'Helvetica Neue',
        'Luminari',
        'PingFang HK Light',
        'InaiMathi Bold',
        'Galvji',
        'Chakra Petch',
    ],
    LINUX: [
        'Arimo',
        'MONO',
        'Ubuntu',
        'Noto Color Emoji',
        'Dancing Script',
        'Droid Sans Mono',
    ],
};

const recordSchema = z.preprocess(
    async (record) => {
        const castRecord = record as any;
        if (castRecord?.browserFingerprint?.userAgent && !castRecord?.requestFingerprint?.headers) {
            const parsedUserAgent = await UAParser(
                castRecord.browserFingerprint.userAgent,
                castRecord.requestFingerprint.headers
            ).withClientHints();

            const knownOsFonts = [];

            if (parsedUserAgent.os.name) {
                if (parsedUserAgent.os.name.startsWith('Windows')) {
                    knownOsFonts.push(...KNOWN_OS_FONTS.WINDOWS);
                } else if (['macOS', 'iOS'].includes(parsedUserAgent.os.name)) {
                    knownOsFonts.push(...KNOWN_OS_FONTS.APPLE);
                }
            }

            return {
                ...castRecord,
                userAgentProps: {
                    parsedUserAgent,
                    isDesktop: !['wearable', 'mobile'].includes(parsedUserAgent.device.type!),
                    knownOsFonts,
                },
            }
        }

        return null;
    }, 
    z.object({
        userAgentProps: z.object({
            parsedUserAgent: z.object({
                browser: z.object({
                    name: z.enum(['Edge', 'Chrome', 'Chrome Mobile', 'Firefox', 'Safari', 'Safari Mobile']),
                }),
                device: z.object({
                    // undefined means desktop
                    type: z.enum(['mobile', 'tablet']).optional(),
                }),
                os: z.object({
                    name: z.string()
                }),
            }),
            isDesktop: z.boolean(),
            knownOsFonts: z.array(z.string()),
        }),
        requestFingerprint: z.object({
            headers: z.record(z.string(), z.string())
        }),
        browserFingerprint: z.object({
            webdriver: z.literal(false).optional(),
            plugins: z.array(z.any()).nonempty(),
            mimeTypes: z.array(z.any()).nonempty(),
            userAgentData: z.object({
                brands: z.array(z.any()).length(3),
                mobile: z.boolean(),
                platform: z.string(),
            }).optional(),
            language: z.string(),
            languages: z.array(z.string()).nonempty(),
            product: z.literal('Gecko'),
            appName: z.literal('Netscape'),
            appCodeName: z.literal('Mozilla'),
            maxTouchPoints: z.number().int().nonnegative(),
            productSub: z.enum(['20030107', '20100101']).optional(),
            vendor: z.enum(['', 'Google Inc.', 'Apple Computer, Inc.']),
            videoCard: z.object({
                renderer: z.string().refine((renderer) => KNOWN_WEBGL_RENDERER_PARTS.some((part) => renderer.includes(part))),
            }),
            fonts: z.array(z.string()),
            screen: z.object({
                width: z.number().positive(),
                height: z.number().positive(),
                availWidth: z.number().positive(),
                availHeight: z.number().positive(),
                clientWidth: z.number().positive(),
                clientHeight: z.number().positive(),
                innerWidth: z.number().positive(),
                innerHeight: z.number().positive(),
                outerWidth: z.number().positive(),
                outerHeight: z.number().positive(),
                colorDepth: z.number().positive(),
                pixelDepth: z.number().positive().optional(),
                devicePixelRatio: z.number().min(1).max(5),
            })
                .refine((data) => data.availWidth <= data.width && data.availHeight <= data.height)
                .refine((data) => data.innerWidth <= data.outerWidth && data.innerHeight <= data.outerHeight)
                .refine((data) => data.clientWidth <= data.innerWidth && data.clientHeight <= data.innerHeight)
                .refine((data) => !data.pixelDepth || data.pixelDepth === data.colorDepth),
            userAgent: z.string(),
        })
    })
    .refine(({ userAgentProps: { isDesktop }, browserFingerprint: { maxTouchPoints, userAgentData }}) => {
        if (isDesktop) {
            return maxTouchPoints === 0 && userAgentData?.mobile !== true
        } else {
            return maxTouchPoints > 0
        }
    })
    .refine(({ userAgentProps: { parsedUserAgent }, browserFingerprint: { productSub }}) => {
        return parsedUserAgent.browser.name === 'Firefox' ? productSub === '20100101' : productSub === '20030107';
    })
    .refine(({ userAgentProps: { parsedUserAgent }, browserFingerprint: { vendor }}) => {
        return parsedUserAgent.browser.name === 'Firefox' && vendor === '' ||
                (parsedUserAgent.browser.name!.startsWith('Safari') && vendor === 'Apple Computer, Inc.') ||
                vendor === 'Google Inc.';
    })
    .refine(({ userAgentProps: { knownOsFonts }, browserFingerprint: { fonts }}) => 
        fonts.length === 0 || 
        knownOsFonts.length === 0 ||
        fonts.some((font) => knownOsFonts.includes(font))
    )
    .refine(({ userAgentProps: { isDesktop }, browserFingerprint: { screen }}) => {
        if (isDesktop) {
            return screen.width >= 512 && screen.height >= 384;
        } else {
            const screenWidth = Math.max(screen.width, screen.height);
            const screenHeight = Math.min(screen.width, screen.height);
            return (
                screenWidth >= 320 &&
                screenWidth <= 2560 &&
                screenHeight >= 480 &&
                screenHeight <= 3200
            );
        }
    })
    .transform(({ userAgentProps, ...rest }) => rest)
);

async function prepareRecords(
    records: Record<string, any>[],
    preprocessingType: string
): Promise<Record<string, any>[]> {
    const cleanedRecords = [];

    for (const record of records) {
        const parsedRecord = recordSchema.parse(record);

        cleanedRecords.push({
            ...parsedRecord,
            userAgent: parsedRecord.browserFingerprint.userAgent,
        } as any);
    }

    // TODO this could break if the list is not there anymore
    // The robots list is available under the MIT license, for details see https://github.com/atmire/COUNTER-Robots/blob/master/LICENSE
    const robotUserAgents = (await fetch(
        'https://raw.githubusercontent.com/atmire/COUNTER-Robots/master/COUNTER_Robots_list.json'
    ).then(async (res) => res.json())) as { pattern: string }[];

    const deconstructedRecords = [];
    const userAgents = new Set();
    for (let x = 0; x < cleanedRecords.length; x++) {
        let record = cleanedRecords[x];
        const { userAgent } = record as { userAgent: string };
        let useRecord =
            !userAgent.match(/(bot|bots|slurp|spider|crawler|crawl)\b/i) &&
            !robotUserAgents.some((robot) =>
                userAgent.match(new RegExp(robot.pattern, 'i'))
            );

        if (useRecord) {
            if (preprocessingType === 'headers') {
                const { httpVersion } = record.requestFingerprint;
                record = record.requestFingerprint.headers;
                record[httpVersionNodeName] = `_${httpVersion}_`;
                if (record[httpVersionNodeName] === '_1.1_') {
                    useRecord = !('user-agent' in record);
                }
            } else {
                record = record.browserFingerprint;
            }
        }

        if (useRecord) {
            deconstructedRecords.push(record);
        } else {
            userAgents.add(userAgent);
        }
    }

    const attributes = new Set<string>();
    deconstructedRecords.forEach((record) => {
        Object.keys(record).forEach((key) => {
            attributes.add(key);
        });
    });

    const reorganizedRecords = [] as Record<string, any>[];
    for (const record of deconstructedRecords) {
        const reorganizedRecord = {} as Record<string, any>;
        for (const attribute of attributes) {
            if (!(attribute in record) || record[attribute] === undefined) {
                reorganizedRecord[attribute] = missingValueDatasetToken;
            } else {
                reorganizedRecord[attribute] = record[attribute];
            }
        }
        reorganizedRecords.push(reorganizedRecord);
    }

    return reorganizedRecords;
}

export class GeneratorNetworksCreator {
    private getDeviceOS(userAgent: string): {
        device: string;
        operatingSystem: string;
    } {
        let operatingSystem = missingValueDatasetToken;
        if (/windows/i.test(userAgent)) {
            operatingSystem = 'windows';
        }
        let device = 'desktop';
        if (/phone|android|mobile/i.test(userAgent)) {
            device = 'mobile';
            if (/iphone|mac/i.test(userAgent)) {
                operatingSystem = 'ios';
            } else if (/android/i.test(userAgent)) {
                operatingSystem = 'android';
            }
        } else if (/linux/i.test(userAgent)) {
            operatingSystem = 'linux';
        } else if (/mac/i.test(userAgent)) {
            operatingSystem = 'macos';
        }

        return { device, operatingSystem };
    }

    private getBrowserNameVersion(
        userAgent: string
    ): `${string}/${string}` | typeof missingValueDatasetToken {
        const canonicalNames = {
            chrome: 'chrome',
            crios: 'chrome',
            firefox: 'firefox',
            fxios: 'firefox',
            safari: 'safari',
            edge: 'edge',
            edg: 'edge',
            edga: 'edge',
            edgios: 'edge',
        } as Record<string, string>;

        const unsupportedBrowsers =
            /opr|yabrowser|SamsungBrowser|UCBrowser|vivaldi/i;
        const edge = /(edg(a|ios|e)?)\/([0-9.]*)/i;
        const safari = /Version\/([\d.]+)( Mobile\/[a-z0-9]+)? Safari/i;
        const supportedBrowsers =
            /(firefox|fxios|chrome|crios|safari)\/([0-9.]*)/i;

        if (unsupportedBrowsers.test(userAgent)) {
            return missingValueDatasetToken;
        }

        if (edge.test(userAgent)) {
            const match = userAgent.match(edge)![0].split('/');
            return `edge/${match[1]}`;
        }

        if (safari.test(userAgent)) {
            const match = userAgent.match(safari);
            return `safari/${match![1]}`;
        }

        if (supportedBrowsers.test(userAgent)) {
            const match = userAgent.match(supportedBrowsers)![0].split('/');
            return `${canonicalNames[match[0].toLowerCase()]}/${match[1]}`;
        }

        return missingValueDatasetToken;
    }

    async prepareHeaderGeneratorFiles(
        datasetPath: string,
        resultsPath: string
    ) {
        const datasetText = fs.readFileSync(datasetPath, { encoding: 'utf8' });
        const records = await prepareRecords(
            JSON.parse(datasetText),
            'headers'
        );

        const inputGeneratorNetwork = new BayesianNetwork({
            path: path.join(
                __dirname,
                'network_structures',
                'input-network-structure.zip'
            ),
        });
        const headerGeneratorNetwork = new BayesianNetwork({
            path: path.join(
                __dirname,
                'network_structures',
                'header-network-structure.zip'
            ),
        });
        // eslint-disable-next-line dot-notation
        const desiredHeaderAttributes = Object.keys(
            headerGeneratorNetwork['nodesByName']
        ).filter((attribute) => !nonGeneratedNodes.includes(attribute));

        let selectedRecords = records.map((record) => {
            return Object.entries(record).reduce(
                (acc: typeof record, [key, value]) => {
                    if (desiredHeaderAttributes.includes(key))
                        acc[key] = value ?? missingValueDatasetToken;
                    return acc;
                },
                {}
            );
        });

        selectedRecords = selectedRecords.map((record) => {
            const userAgent = (
                record['user-agent'] !== missingValueDatasetToken
                    ? record['user-agent']
                    : record['User-Agent']
            ).toLowerCase();

            const browser = this.getBrowserNameVersion(userAgent);
            const { device, operatingSystem } = this.getDeviceOS(userAgent);

            return {
                ...record,
                [browserNodeName]: browser,
                [operatingSystemNodeName]: operatingSystem,
                [deviceNodeName]: device,
                [browserHttpNodeName]: `${browser}|${
                    (record[httpVersionNodeName] as string).startsWith('_1')
                        ? '1'
                        : '2'
                }`,
            };
        });

        headerGeneratorNetwork.setProbabilitiesAccordingToData(selectedRecords);
        inputGeneratorNetwork.setProbabilitiesAccordingToData(selectedRecords);

        const inputNetworkDefinitionPath = path.join(
            resultsPath,
            'input-network-definition.zip'
        );
        const headerNetworkDefinitionPath = path.join(
            resultsPath,
            'header-network-definition.zip'
        );
        const browserHelperFilePath = path.join(
            resultsPath,
            'browser-helper-file.json'
        );

        headerGeneratorNetwork.saveNetworkDefinition({
            path: headerNetworkDefinitionPath,
        });
        inputGeneratorNetwork.saveNetworkDefinition({
            path: inputNetworkDefinitionPath,
        });

        const uniqueBrowsersAndHttps = Array.from(
            new Set(
                selectedRecords.map((record) => record[browserHttpNodeName])
            )
        );
        fs.writeFileSync(
            browserHelperFilePath,
            JSON.stringify(uniqueBrowsersAndHttps)
        );
    }

    async prepareFingerprintGeneratorFiles(
        datasetPath: string,
        resultsPath: string
    ) {
        const datasetText = fs
            .readFileSync(datasetPath, { encoding: 'utf8' })
            .replace(/^\ufeff/, '');
        const records = await prepareRecords(
            JSON.parse(datasetText),
            'fingerprints'
        );
        for (let x = 0; x < records.length; x++) {
            // eslint-disable-next-line no-console
            if (x % 1000 === 0)
                console.log(`Processing record ${x} of ${records.length}`);
            const record = records[x];
            const pluginCharacteristics = {} as { [key: string]: string };
            for (const pluginCharacteristicsAttribute of PLUGIN_CHARACTERISTICS_ATTRIBUTES) {
                if (pluginCharacteristicsAttribute in record) {
                    if (record[pluginCharacteristicsAttribute] !== '') {
                        pluginCharacteristics[pluginCharacteristicsAttribute] =
                            record[pluginCharacteristicsAttribute];
                    }
                    delete record[pluginCharacteristicsAttribute];
                }
            }

            record.pluginsData =
                Object.keys(pluginCharacteristics).length !== 0
                    ? pluginCharacteristics
                    : missingValueDatasetToken;

            for (const attribute of Object.keys(record)) {
                if ([null, '', undefined].includes(record[attribute])) {
                    record[attribute] = missingValueDatasetToken;
                } else {
                    record[attribute] =
                        typeof record[attribute] === 'string' ||
                        record[attribute] instanceof String
                            ? record[attribute]
                            : STRINGIFIED_PREFIX +
                              JSON.stringify(record[attribute]);
                }
            }

            records[x] = record;
        }

        const fingerprintGeneratorNetwork = new BayesianNetwork({
            path: path.join(
                __dirname,
                'network_structures',
                'fingerprint-network-structure.zip'
            ),
        });
        // eslint-disable-next-line dot-notation
        const desiredFingerprintAttributes = Object.keys(
            fingerprintGeneratorNetwork['nodesByName']
        );

        const selectedRecords = records.map((record) => {
            return Object.entries(record).reduce(
                (acc: typeof record, [key, value]) => {
                    if (desiredFingerprintAttributes.includes(key))
                        acc[key] = value ?? missingValueDatasetToken;
                    return acc;
                },
                {}
            );
        });

        const fingerprintNetworkDefinitionPath = path.join(
            resultsPath,
            'fingerprint-network-definition.zip'
        );

        // eslint-disable-next-line no-console
        console.log('Building the fingerprint network...');
        fingerprintGeneratorNetwork.setProbabilitiesAccordingToData(
            selectedRecords
        );
        fingerprintGeneratorNetwork.saveNetworkDefinition({
            path: fingerprintNetworkDefinitionPath,
        });
    }
}
