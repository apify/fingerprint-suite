import { type HeaderGeneratorOptions } from './header-generator';

export const MODERN_DESKTOP = {
    browserListQuery: 'last 5 versions',
} satisfies Partial<HeaderGeneratorOptions>;

export const MODERN_MOBILE = {
    ...MODERN_DESKTOP,
    devices: ['mobile'],
} satisfies Partial<HeaderGeneratorOptions>;

export const MODERN_LINUX = {
    ...MODERN_DESKTOP,
    operatingSystems: ['linux'],
} satisfies Partial<HeaderGeneratorOptions>;

export const MODERN_LINUX_FIREFOX = {
    browserListQuery: 'last 5 firefox versions',
    operatingSystems: ['linux'],
} satisfies Partial<HeaderGeneratorOptions>;

export const MODERN_LINUX_CHROME = {
    browserListQuery: 'last 5 chrome versions',
    operatingSystems: ['linux'],
} satisfies Partial<HeaderGeneratorOptions>;

export const MODERN_WINDOWS = {
    ...MODERN_DESKTOP,
    operatingSystems: ['windows'],
} satisfies Partial<HeaderGeneratorOptions>;

export const MODERN_WINDOWS_FIREFOX = {
    browserListQuery: 'last 5 firefox versions',
    operatingSystems: ['windows'],
} satisfies Partial<HeaderGeneratorOptions>;

export const MODERN_WINDOWS_CHROME = {
    browserListQuery: 'last 5 chrome versions',
    operatingSystems: ['windows'],
} satisfies Partial<HeaderGeneratorOptions>;

export const MODERN_MACOS = {
    ...MODERN_DESKTOP,
    operatingSystems: ['macos'],
} satisfies Partial<HeaderGeneratorOptions>;

export const MODERN_MACOS_FIREFOX = {
    browserListQuery: 'last 5 firefox versions',
    operatingSystems: ['macos'],
} satisfies Partial<HeaderGeneratorOptions>;

export const MODERN_MACOS_CHROME = {
    browserListQuery: 'last 5 chrome versions',
    operatingSystems: ['macos'],
} satisfies Partial<HeaderGeneratorOptions>;

export const MODERN_ANDROID = {
    ...MODERN_MOBILE,
    operatingSystems: ['android'],
} satisfies Partial<HeaderGeneratorOptions>;
