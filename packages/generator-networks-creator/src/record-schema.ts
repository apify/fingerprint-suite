import { z } from 'zod';
import { UAParser } from 'ua-parser-js';
import fetch from 'node-fetch';

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
        'Calibri',
        'MS Outlook',
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
};

export async function getRecordSchema() {
    const robotUserAgents = (await fetch(
        'https://raw.githubusercontent.com/atmire/COUNTER-Robots/master/COUNTER_Robots_list.json',
    ).then(async (res) => res.json())) as { pattern: string }[];

    return z.preprocess(
        (record) => {
            const castRecord = record as any;
            if (
                castRecord?.browserFingerprint?.userAgent &&
                castRecord?.requestFingerprint?.headers
            ) {
                const parsedUserAgent = UAParser(
                    castRecord.browserFingerprint.userAgent,
                    castRecord.requestFingerprint.headers,
                );

                let knownOsFonts: string[] = [];

                if (parsedUserAgent.os.name) {
                    if (parsedUserAgent.os.name.startsWith('Windows')) {
                        knownOsFonts = KNOWN_OS_FONTS.WINDOWS;
                    } else if (
                        ['macOS', 'iOS'].includes(parsedUserAgent.os.name)
                    ) {
                        knownOsFonts = KNOWN_OS_FONTS.APPLE;
                    }
                }

                return {
                    ...castRecord,
                    userAgentProps: {
                        parsedUserAgent,
                        isDesktop: !['wearable', 'mobile'].includes(
                            parsedUserAgent.device.type!,
                        ),
                        knownOsFonts,
                    },
                };
            }

            return null;
        },
        z
            .object({
                userAgentProps: z.object({
                    parsedUserAgent: z.object({
                        browser: z.object({
                            name: z.enum([
                                'Edge',
                                'Chrome',
                                'Mobile Chrome',
                                'Firefox',
                                'Safari',
                                'Mobile Safari',
                                'Mobile Firefox',
                            ]),
                        }),
                        device: z.object({
                            // undefined means desktop
                            type: z.enum(['mobile', 'tablet']).optional(),
                        }),
                        os: z.object({
                            name: z.string(),
                        }),
                    }),
                    isDesktop: z.boolean(),
                    knownOsFonts: z.array(z.string()),
                }),
                requestFingerprint: z.object({
                    headers: z.record(z.string(), z.string()),
                    httpVersion: z.string(),
                }),
                browserFingerprint: z.object({
                    webdriver: z.literal(false).optional(),
                    appVersion: z.string(),
                    hardwareConcurrency: z.number().int().nonnegative(),
                    multimediaDevices: z.object({
                        speakers: z.array(z.any()),
                        micros: z.array(z.any()),
                        webcams: z.array(z.any()),
                    }),
                    extraProperties: z.any(),
                    plugins: z.array(z.any()),
                    mimeTypes: z.array(z.any()),
                    deviceMemory: z.number().nullable(),
                    oscpu: z.string().nullable(),
                    battery: z
                        .object({
                            charging: z.boolean(),
                            chargingTime: z.number().nullable(),
                            dischargingTime: z.boolean().nullable(),
                            level: z.number().min(0).max(1),
                        })
                        .nullable(),
                    platform: z.string(),
                    doNotTrack: z.enum(['1', '0']).nullable(),
                    audioCodecs: z.record(
                        z.enum(['ogg', 'mp3', 'wav', 'm4a', 'aac']),
                        z.enum(['probably', 'maybe', '']),
                    ),
                    videoCodecs: z.record(
                        z.enum(['ogg', 'h264', 'webm']),
                        z.enum(['probably', 'maybe', '']),
                    ),
                    userAgentData: z
                        .object({
                            brands: z.array(
                                z.object({
                                    brand: z.string(),
                                    version: z.string(),
                                }),
                            ),
                            mobile: z.boolean(),
                            platform: z.string(),
                        })
                        .optional()
                        .nullable(),
                    language: z.string(),
                    languages: z.array(z.string()).nonempty(),
                    product: z.literal('Gecko'),
                    appName: z.literal('Netscape'),
                    appCodeName: z.literal('Mozilla'),
                    maxTouchPoints: z.number().int().nonnegative(),
                    productSub: z.enum(['20030107', '20100101']).optional(),
                    vendor: z.enum(['', 'Google Inc.', 'Apple Computer, Inc.']),
                    vendorSub: z.string().length(0),
                    videoCard: z.object({
                        renderer: z
                            .string()
                            .refine((renderer) =>
                                KNOWN_WEBGL_RENDERER_PARTS.some((part) =>
                                    renderer.includes(part),
                                ),
                            ),
                        vendor: z.string(),
                    }),
                    fonts: z.array(z.string()),
                    screen: z
                        .object({
                            availTop: z.number().nonnegative(),
                            availLeft: z.number().nonnegative(),
                            pageXOffset: z.number().nonnegative(),
                            pageYOffset: z.number().nonnegative(),
                            screenX: z.number().nonnegative(),
                            hasHDR: z.boolean().optional(),
                            width: z.number().positive(),
                            height: z.number().positive(),
                            availWidth: z.number().positive(),
                            availHeight: z.number().positive(),
                            clientWidth: z.number().nonnegative(),
                            clientHeight: z.number().nonnegative(),
                            innerWidth: z.number().nonnegative(),
                            innerHeight: z.number().nonnegative(),
                            outerWidth: z.number().positive(),
                            outerHeight: z.number().positive(),
                            colorDepth: z.number().positive().optional(),
                            pixelDepth: z.number().positive().optional(),
                            devicePixelRatio: z.number().min(0).max(5),
                        })
                        .refine(
                            (data) =>
                                data.availWidth <= data.width &&
                                data.availHeight <= data.height,
                            'Available width and height should be less than or equal to width and height',
                        )
                        .refine(
                            (data) =>
                                data.innerWidth <= data.outerWidth &&
                                data.innerHeight <= data.outerHeight,
                            'Inner width and height should be less than or equal to outer width and height',
                        )
                        .refine(
                            (data) =>
                                !data.pixelDepth ||
                                data.pixelDepth === data.colorDepth,
                            'Pixel depth should be equal to color depth',
                        ),
                    userAgent: z
                        .string()
                        .refine(
                            (userAgent) =>
                                !userAgent.match(
                                    /(bot|bots|slurp|spider|crawler|crawl)\b/i,
                                ),
                            'User agent should not contain bot, bots, slurp, spider, crawler, or crawl',
                        )
                        .refine(
                            (userAgent) =>
                                !robotUserAgents.some((robot) =>
                                    userAgent.match(
                                        new RegExp(robot.pattern, 'i'),
                                    ),
                                ),
                            'User agent should not match any known robot user agent patterns',
                        ),
                }),
            })
            .refine(
                ({
                    userAgentProps: { parsedUserAgent },
                    browserFingerprint: { productSub },
                }) =>
                    parsedUserAgent.browser.name.includes('Firefox')
                        ? productSub === '20100101'
                        : productSub === '20030107',
                "ProductSub should be '20100101' for Firefox and '20030107' for other browsers",
            )
            .refine(
                ({
                    userAgentProps: { parsedUserAgent },
                    browserFingerprint: { vendor },
                }) =>
                    (parsedUserAgent.browser.name.includes('Firefox') &&
                        vendor === '') ||
                    (parsedUserAgent.browser.name.includes('Safari') &&
                        vendor === 'Apple Computer, Inc.') ||
                    vendor === 'Google Inc.',
            )
            .refine(
                ({
                    requestFingerprint: { headers },
                    browserFingerprint: { userAgent },
                }) => {
                    const userAgentHeader =
                        headers['user-agent'] || headers['User-Agent'];
                    return userAgentHeader === userAgent;
                },
                'User-Agent header should match the browser fingerprint user agent',
            )
            .refine(
                ({
                    userAgentProps: { knownOsFonts },
                    browserFingerprint: { fonts },
                }) =>
                    fonts.length === 0 ||
                    knownOsFonts.length === 0 ||
                    fonts.some((font) => knownOsFonts.includes(font)),
                'Fonts should be empty or contain known OS fonts',
            )
            .refine(
                ({
                    userAgentProps: { isDesktop },
                    browserFingerprint: { screen },
                }) => {
                    const screenMax = Math.max(screen.width, screen.height);
                    const screenMin = Math.min(screen.width, screen.height);

                    if (isDesktop) {
                        if (screenMax < 512 || screenMin < 384) {
                            return false;
                        }
                    }

                    return (
                        screenMax >= 480 &&
                        screenMax <= 7680 &&
                        screenMin >= 320 &&
                        screenMin <= 4320
                    );
                },
                'Screen width and height should be valid for the device type',
            )
            .transform(({ userAgentProps, ...rest }) => ({
                ...rest,
                userAgent: rest.browserFingerprint.userAgent,
            })),
    );
}
