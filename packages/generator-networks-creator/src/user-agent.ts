import { missingValueDatasetToken } from './constants.js';

export function getDeviceOS(userAgent: string): {
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

export function getBrowserNameVersion(
    userAgent: string,
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
    // `safari` is deliberately absent here: the `Safari/x.y.z` token carries the
    // WebKit build number, not the Safari version. Only the `Version/x.y` token
    // (handled by `safari` above) does. Matching `Safari/...` as a fallback would
    // mint bogus browsers like `safari/605.1` that no browserslist query can ever
    // select, silently corrupting the model.
    const supportedBrowsers = /(firefox|fxios|chrome|crios)\/([0-9.]*)/i;

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
