import type {
    Fingerprint,
    ScreenFingerprint,
} from './fingerprint-generator.js';

const normalizeScreenFingerprint = (
    screen: ScreenFingerprint,
): ScreenFingerprint => {
    const innerWidth =
        screen.innerWidth > 0
            ? screen.innerWidth
            : Math.min(screen.width, screen.outerWidth);
    const innerHeight =
        screen.innerHeight > 0
            ? screen.innerHeight
            : Math.min(screen.height, screen.outerHeight);

    return {
        ...screen,
        innerWidth,
        innerHeight,
        clientWidth: screen.clientWidth > 0 ? screen.clientWidth : innerWidth,
        clientHeight:
            screen.clientHeight > 0 ? screen.clientHeight : innerHeight,
    };
};

/**
 * Transforms fingerprint to the final scheme, more suitable for fingerprint manipulation and injection.
 * This schema is used in the `fingerprint-injector`.
 * @param fingerprint Fingerprint to be transformed.
 * @returns Transformed fingerprint.
 */
export function transformFingerprint(
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
    const normalizedScreen = normalizeScreenFingerprint(screen);

    const navigator = {
        userAgent,
        userAgentData,
        language: languages[0],
        languages,
        platform,
        deviceMemory: Number.isNaN(parsedMemory) ? null : parsedMemory, // Firefox does not have deviceMemory available
        hardwareConcurrency: parseInt(hardwareConcurrency, 10),
        maxTouchPoints: Number.isNaN(parsedTouchPoints) ? 0 : parsedTouchPoints,
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
        screen: normalizedScreen,
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
