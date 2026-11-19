import {
    Fingerprint,
    ScreenFingerprint,
    NavigatorFingerprint,
    VideoCard,
    UserAgentData,
} from 'fingerprint-generator';

interface NavigatorWithUserAgentData extends Navigator {
    userAgentData?: {
        brands: Array<{ brand: string; version: string }>;
        mobile: boolean;
        platform: string;
        getHighEntropyValues?(hints: string[]): Promise<any>;
    };
}

interface NavigatorWithBattery extends Navigator {
    getBattery?(): Promise<BatteryManager>;
}

interface BatteryManager {
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
    level: number;
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ): void;
    removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
    ): void;
    dispatchEvent(event: Event): boolean;
}

interface ScreenWithHDR extends Screen {
    getHDREnabled?(): boolean;
    hasHDR?: boolean;
}

document.addEventListener('DOMContentLoaded', () => {
    initFingerprintComparison();
});

async function initFingerprintComparison(): Promise<void> {
    const fingerprint = getFingerprintData();
    await fillComparisonTable(fingerprint);
}

function getFingerprintData(): Fingerprint {
    const fingerprintElement = document.getElementById('fingerprint-data');
    if (!fingerprintElement) {
        throw new Error('Fingerprint data element not found');
    }
    return JSON.parse(fingerprintElement.textContent || '{}');
}

function getValueByPath(
    obj: Record<string, unknown> | null,
    path: string,
): unknown {
    return path.split('.').reduce<unknown>((prev, curr) => {
        if (prev && typeof prev === 'object' && curr in prev) {
            return (prev as Record<string, unknown>)[curr];
        }
        return null;
    }, obj);
}

type FingerprintProperty =
    // Screen properties
    | 'screen.width'
    | 'screen.height'
    | 'screen.availWidth'
    | 'screen.availHeight'
    | 'screen.availTop'
    | 'screen.availLeft'
    | 'screen.pageXOffset'
    | 'screen.pageYOffset'
    | 'screen.screenX'
    | 'screen.hasHDR'
    | 'screen.colorDepth'
    | 'screen.pixelDepth'
    | 'screen.devicePixelRatio'
    | 'screen.innerWidth'
    | 'screen.innerHeight'
    | 'screen.outerWidth'
    | 'screen.outerHeight'
    | 'screen.clientWidth'
    | 'screen.clientHeight'

    // Navigator properties
    | 'navigator.userAgent'
    | 'navigator.language'
    | 'navigator.languages'
    | 'navigator.platform'
    | 'navigator.deviceMemory'
    | 'navigator.hardwareConcurrency'
    | 'navigator.maxTouchPoints'
    | 'navigator.vendor'
    | 'navigator.webdriver'
    | 'navigator.product'
    | 'navigator.productSub'
    | 'navigator.doNotTrack'
    | 'navigator.appCodeName'
    | 'navigator.appName'
    | 'navigator.appVersion'
    | 'navigator.oscpu'

    // Navigator userAgentData
    | 'navigator.userAgentData.brands'
    | 'navigator.userAgentData.mobile'
    | 'navigator.userAgentData.platform'

    // Audio/Video codecs
    | 'audioCodecs.ogg'
    | 'audioCodecs.mp3'
    | 'audioCodecs.wav'
    | 'audioCodecs.m4a'
    | 'audioCodecs.aac'
    | 'videoCodecs.ogg'
    | 'videoCodecs.h264'
    | 'videoCodecs.webm'

    // Plugins
    | 'pluginsData.plugins.length'

    // Battery
    | 'battery.charging'
    | 'battery.level'
    | 'battery.chargingTime'
    | 'battery.dischargingTime'

    // WebGL
    | 'videoCard.renderer'
    | 'videoCard.vendor'

    // Multimedia devices
    | 'multimediaDevices.speakers.length'
    | 'multimediaDevices.micros.length'
    | 'multimediaDevices.webcams.length'

    // Fonts
    | 'fonts.length';

const BrowserChecks: Record<FingerprintProperty, () => unknown> = {
    // Screen properties
    'screen.width': () => window.screen.width,
    'screen.height': () => window.screen.height,
    'screen.availWidth': () => window.screen.availWidth,
    'screen.availHeight': () => window.screen.availHeight,
    'screen.availTop': () =>
        (window.screen as any).availTop !== undefined
            ? (window.screen as any).availTop
            : 0,
    'screen.availLeft': () =>
        (window.screen as any).availLeft !== undefined
            ? (window.screen as any).availLeft
            : 0,
    'screen.pageXOffset': () => window.pageXOffset,
    'screen.pageYOffset': () => window.pageYOffset,
    'screen.screenX': () => window.screenX,
    'screen.hasHDR': () => {
        const screenWithHDR = window.screen as ScreenWithHDR;
        return screenWithHDR.getHDREnabled
            ? screenWithHDR.getHDREnabled()
            : screenWithHDR.hasHDR !== undefined
              ? screenWithHDR.hasHDR
              : false;
    },
    'screen.colorDepth': () => window.screen.colorDepth,
    'screen.pixelDepth': () => window.screen.pixelDepth,
    'screen.devicePixelRatio': () => window.devicePixelRatio,
    'screen.innerWidth': () => window.innerWidth,
    'screen.innerHeight': () => window.innerHeight,
    'screen.outerWidth': () => window.outerWidth,
    'screen.outerHeight': () => window.outerHeight,
    'screen.clientWidth': () => document.documentElement.clientWidth,
    'screen.clientHeight': () => document.documentElement.clientHeight,

    // Navigator properties
    'navigator.userAgent': () => navigator.userAgent,
    'navigator.language': () => navigator.language,
    'navigator.languages': () => navigator.languages,
    'navigator.platform': () => navigator.platform,
    'navigator.deviceMemory': () => (navigator as any).deviceMemory,
    'navigator.hardwareConcurrency': () => navigator.hardwareConcurrency,
    'navigator.maxTouchPoints': () => navigator.maxTouchPoints,
    'navigator.vendor': () => navigator.vendor,
    'navigator.webdriver': () => navigator.webdriver,
    'navigator.product': () => navigator.product,
    'navigator.productSub': () => navigator.productSub,
    'navigator.doNotTrack': () => navigator.doNotTrack,
    'navigator.appCodeName': () => navigator.appCodeName,
    'navigator.appName': () => navigator.appName,
    'navigator.appVersion': () => navigator.appVersion,
    'navigator.oscpu': () => (navigator as any).oscpu,

    // Navigator userAgentData
    'navigator.userAgentData.brands': () => {
        const navWithUA = navigator as NavigatorWithUserAgentData;
        return navWithUA.userAgentData ? navWithUA.userAgentData.brands : null;
    },
    'navigator.userAgentData.mobile': () => {
        const navWithUAMobile = navigator as NavigatorWithUserAgentData;
        return navWithUAMobile.userAgentData
            ? navWithUAMobile.userAgentData.mobile
            : null;
    },
    'navigator.userAgentData.platform': () => {
        const navWithUAPlatform = navigator as NavigatorWithUserAgentData;
        return navWithUAPlatform.userAgentData
            ? navWithUAPlatform.userAgentData.platform
            : null;
    },

    // Video/Audio codec properties
    'audioCodecs.ogg': () =>
        new Audio().canPlayType('audio/ogg; codecs="vorbis"'),
    'audioCodecs.mp3': () => new Audio().canPlayType('audio/mpeg'),
    'audioCodecs.wav': () => new Audio().canPlayType('audio/wav; codecs="1"'),
    'audioCodecs.m4a': () => new Audio().canPlayType('audio/x-m4a'),
    'audioCodecs.aac': () => new Audio().canPlayType('audio/aac'),

    'videoCodecs.ogg': () =>
        document
            .createElement('video')
            .canPlayType('video/ogg; codecs="theora"'),
    'videoCodecs.h264': () =>
        document
            .createElement('video')
            .canPlayType('video/mp4; codecs="avc1.42E01E"'),
    'videoCodecs.webm': () =>
        document
            .createElement('video')
            .canPlayType('video/webm; codecs="vp8, vorbis"'),

    // Plugins
    'pluginsData.plugins.length': () =>
        navigator.plugins ? navigator.plugins.length : 0,

    // Battery
    'battery.charging': async () => {
        const navWithBattery = navigator as NavigatorWithBattery;
        if (navWithBattery.getBattery) {
            const battery = await navWithBattery.getBattery();
            return battery.charging;
        }
        return 'API not available';
    },

    'battery.level': async () => {
        const navWithBatteryLevel = navigator as NavigatorWithBattery;
        if (navWithBatteryLevel.getBattery) {
            const battery = await navWithBatteryLevel.getBattery();
            return battery.level;
        }
        return 'API not available';
    },

    'battery.chargingTime': async () => {
        const navWithBatteryChargingTime = navigator as NavigatorWithBattery;
        if (navWithBatteryChargingTime.getBattery) {
            const battery = await navWithBatteryChargingTime.getBattery();
            return battery.chargingTime;
        }
        return 'API not available';
    },

    'battery.dischargingTime': async () => {
        const navWithBatteryDischargingTime = navigator as NavigatorWithBattery;
        if (navWithBatteryDischargingTime.getBattery) {
            const battery = await navWithBatteryDischargingTime.getBattery();
            return battery.dischargingTime;
        }
        return 'API not available';
    },

    // Video card info using WebGL
    'videoCard.renderer': () => {
        try {
            const canvas = document.createElement('canvas');
            const gl =
                (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
                (canvas.getContext(
                    'experimental-webgl',
                ) as WebGLRenderingContext | null);
            if (!gl) return 'WebGL not supported';
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (!debugInfo) return 'WEBGL_debug_renderer_info not supported';
            return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        } catch (e) {
            return 'Error getting WebGL info';
        }
    },

    'videoCard.vendor': () => {
        try {
            const canvas = document.createElement('canvas');
            const gl =
                (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
                (canvas.getContext(
                    'experimental-webgl',
                ) as WebGLRenderingContext | null);
            if (!gl) return 'WebGL not supported';
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (!debugInfo) return 'WEBGL_debug_renderer_info not supported';
            return gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        } catch (e) {
            return 'Error getting WebGL info';
        }
    },

    // Multimedia devices
    'multimediaDevices.speakers.length': async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter((device) => device.kind === 'audiooutput')
                .length;
        } catch (e) {
            return 'Error getting media devices';
        }
    },

    'multimediaDevices.micros.length': async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter((device) => device.kind === 'audioinput')
                .length;
        } catch (e) {
            return 'Error getting media devices';
        }
    },

    'multimediaDevices.webcams.length': async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter((device) => device.kind === 'videoinput')
                .length;
        } catch (e) {
            return 'Error getting media devices';
        }
    },

    // Fonts (limited detection)
    'fonts.length': () => 'Cannot access system fonts directly',
};

async function getBrowserValue(
    property: FingerprintProperty,
): Promise<unknown> {
    try {
        const checkFunction = BrowserChecks[property];
        return await checkFunction();
    } catch (error: any) {
        return `Error: ${error.message}`;
    }
}

function getPropertyCode(property: FingerprintProperty): Function {
    return BrowserChecks[property];
}

const propertiesToCheck: FingerprintProperty[] = [
    // Screen properties
    'screen.width',
    'screen.height',
    'screen.availWidth',
    'screen.availHeight',
    'screen.availTop',
    'screen.availLeft',
    'screen.pageXOffset',
    'screen.pageYOffset',
    'screen.screenX',
    'screen.hasHDR',
    'screen.colorDepth',
    'screen.pixelDepth',
    'screen.devicePixelRatio',
    'screen.innerWidth',
    'screen.innerHeight',
    'screen.outerWidth',
    'screen.outerHeight',
    'screen.clientWidth',
    'screen.clientHeight',

    // Navigator properties
    'navigator.userAgent',
    'navigator.language',
    'navigator.languages',
    'navigator.platform',
    'navigator.deviceMemory',
    'navigator.hardwareConcurrency',
    'navigator.maxTouchPoints',
    'navigator.vendor',
    'navigator.webdriver',
    'navigator.product',
    'navigator.productSub',
    'navigator.doNotTrack',
    'navigator.appCodeName',
    'navigator.appName',
    'navigator.appVersion',
    'navigator.oscpu',

    // Navigator userAgentData
    'navigator.userAgentData.brands',
    'navigator.userAgentData.mobile',
    'navigator.userAgentData.platform',

    // Audio/Video codecs
    'audioCodecs.ogg',
    'audioCodecs.mp3',
    'audioCodecs.wav',
    'audioCodecs.m4a',
    'audioCodecs.aac',
    'videoCodecs.ogg',
    'videoCodecs.h264',
    'videoCodecs.webm',

    // Plugins
    'pluginsData.plugins.length',

    // Battery
    'battery.charging',
    'battery.level',
    'battery.chargingTime',
    'battery.dischargingTime',

    // WebGL
    'videoCard.renderer',
    'videoCard.vendor',

    // Multimedia devices
    'multimediaDevices.speakers.length',
    'multimediaDevices.micros.length',
    'multimediaDevices.webcams.length',

    // Fonts (limited detection capability)
    'fonts.length',
];

async function fillComparisonTable(
    fingerprintData: Fingerprint,
): Promise<void> {
    const tbody = document.getElementById('comparison-tbody');
    if (!tbody) {
        console.error('Table body not found');
        return;
    }

    for (const property of propertiesToCheck) {
        const fingerprintValue = getValueByPath(fingerprintData, property);
        const browserValue = await getBrowserValue(property);
        const codeFunction = getPropertyCode(property);

        const isMatch =
            JSON.stringify(fingerprintValue) === JSON.stringify(browserValue);

        const row = document.createElement('tr');
        if (!isMatch) {
            row.classList.add('mismatch');
        }

        row.innerHTML = `
      <td>${property}</td>
      <td><pre>${JSON.stringify(fingerprintValue, null, 2)}</pre></td>
      <td><pre>${JSON.stringify(browserValue, null, 2)}</pre></td>
      <td><div class="code">${codeFunction.toString()}</div></td>
    `;

        tbody.appendChild(row);
    }
}
