export const SUPPORTED_BROWSERS = [
    'chrome',
    'firefox',
    'safari',
    'edge',
] as const;
export const SUPPORTED_OPERATING_SYSTEMS = [
    'windows',
    'macos',
    'linux',
    'android',
    'ios',
] as const;
export const SUPPORTED_DEVICES = ['desktop', 'mobile'] as const;
export const SUPPORTED_HTTP_VERSIONS = ['1', '2'] as const;

export const BROWSER_HTTP_NODE_NAME = '*BROWSER_HTTP' as const;
export const OPERATING_SYSTEM_NODE_NAME = '*OPERATING_SYSTEM' as const;
export const DEVICE_NODE_NAME = '*DEVICE' as const;
export const MISSING_VALUE_DATASET_TOKEN = '*MISSING_VALUE*' as const;

export const HTTP1_SEC_FETCH_ATTRIBUTES = {
    mode: 'Sec-Fetch-Mode',
    dest: 'Sec-Fetch-Dest',
    site: 'Sec-Fetch-Site',
    user: 'Sec-Fetch-User',
} as const;

export const HTTP2_SEC_FETCH_ATTRIBUTES = {
    mode: 'sec-fetch-mode',
    dest: 'sec-fetch-dest',
    site: 'sec-fetch-site',
    user: 'sec-fetch-user',
} as const;
