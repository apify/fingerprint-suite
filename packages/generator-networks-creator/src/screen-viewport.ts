const VIEWPORT_DIMENSIONS = [
    'innerWidth',
    'innerHeight',
    'clientWidth',
    'clientHeight',
] as const;

type ScreenRecord = Record<string, unknown>;

function isPositiveNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function minPositiveNumber(...values: unknown[]): number | undefined {
    const positiveValues = values.filter(isPositiveNumber);
    return positiveValues.length === 0
        ? undefined
        : Math.min(...positiveValues);
}

export function normalizeCollectedScreenViewport(screen: unknown): unknown {
    if (!screen || typeof screen !== 'object') return screen;

    const normalized = { ...(screen as ScreenRecord) };
    const screenWidth = normalized.width;
    const screenHeight = normalized.height;
    const availWidth = normalized.availWidth;
    const availHeight = normalized.availHeight;
    const outerWidth = isPositiveNumber(normalized.outerWidth)
        ? normalized.outerWidth
        : minPositiveNumber(screenWidth, availWidth);
    const outerHeight = isPositiveNumber(normalized.outerHeight)
        ? normalized.outerHeight
        : minPositiveNumber(screenHeight, availHeight);

    if (!isPositiveNumber(normalized.innerWidth)) {
        const innerWidth = minPositiveNumber(
            normalized.width,
            normalized.availWidth,
            outerWidth,
        );
        if (innerWidth !== undefined) normalized.innerWidth = innerWidth;
    }

    if (!isPositiveNumber(normalized.innerHeight)) {
        const innerHeight = minPositiveNumber(
            normalized.height,
            normalized.availHeight,
            outerHeight,
        );
        if (innerHeight !== undefined) normalized.innerHeight = innerHeight;
    }

    if (
        !isPositiveNumber(normalized.clientWidth) &&
        isPositiveNumber(normalized.innerWidth)
    ) {
        normalized.clientWidth = normalized.innerWidth;
    }

    if (
        !isPositiveNumber(normalized.clientHeight) &&
        isPositiveNumber(normalized.innerHeight)
    ) {
        normalized.clientHeight = normalized.innerHeight;
    }

    return normalized;
}

export function normalizeFingerprintRecordScreenViewport(
    record: Record<string, any>,
) {
    const screen = record.browserFingerprint?.screen;
    if (!screen || typeof screen !== 'object') return record;

    return {
        ...record,
        browserFingerprint: {
            ...record.browserFingerprint,
            screen: normalizeCollectedScreenViewport(screen),
        },
    };
}

export function hasZeroViewportDimensions(screen: unknown): boolean {
    if (!screen || typeof screen !== 'object') return false;

    const screenRecord = screen as ScreenRecord;
    return VIEWPORT_DIMENSIONS.some(
        (dimension) => screenRecord[dimension] === 0,
    );
}
