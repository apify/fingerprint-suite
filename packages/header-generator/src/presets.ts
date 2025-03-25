export const MODERN_DESKTOP = {
    browserListQuery: 'last 5 versions',
};

export const MODERN_MOBILE = {
    ...MODERN_DESKTOP,
    devices: ['mobile'],
};

export const MODERN_LINUX = {
    ...MODERN_DESKTOP,
    operatingSystems: ['linux'],
};

export const MODERN_LINUX_FIREFOX = {
    browserListQuery: 'last 5 firefox versions',
    operatingSystems: ['linux'],
};

export const MODERN_LINUX_CHROME = {
    browserListQuery: 'last 5 chrome versions',
    operatingSystems: ['linux'],
};

export const MODERN_WINDOWS = {
    ...MODERN_DESKTOP,
    operatingSystems: ['windows'],
};

export const MODERN_WINDOWS_FIREFOX = {
    browserListQuery: 'last 5 firefox versions',
    operatingSystems: ['windows'],
};

export const MODERN_WINDOWS_CHROME = {
    browserListQuery: 'last 5 chrome versions',
    operatingSystems: ['windows'],
};

export const MODERN_MACOS = {
    ...MODERN_DESKTOP,
    operatingSystems: ['macos'],
};

export const MODERN_MACOS_FIREFOX = {
    browserListQuery: 'last 5 firefox versions',
    operatingSystems: ['macos'],
};

export const MODERN_MACOS_CHROME = {
    browserListQuery: 'last 5 chrome versions',
    operatingSystems: ['macos'],
};

export const MODERN_ANDROID = {
    ...MODERN_MOBILE,
    operatingSystems: ['android'],
};
