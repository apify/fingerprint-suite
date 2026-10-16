/**
 * Some HTTP headers depend on the request (for example Accept (with values application/json, image/png) etc.).
 *  This function filters out those headers and leaves only the browser-wide ones.
 * @param headers Headers to be filtered.
 * @returns Filtered headers.
 */
export function onlyInjectableHeaders(
    headers: Record<string, string>,
    browserName?: string,
): Record<string, string> {
    const requestHeaders = [
        'accept-encoding',
        'accept',
        'cache-control',
        'pragma',
        'sec-fetch-dest',
        'sec-fetch-mode',
        'sec-fetch-site',
        'sec-fetch-user',
        'upgrade-insecure-requests',
    ];

    const filteredHeaders = { ...headers };

    requestHeaders.forEach((header) => {
        delete filteredHeaders[header];
    });

    // Chromium-based controlled browsers do not support `te` header.
    // Probably needs more investigation, but for now, we can just remove it.
    if (!(browserName?.toLowerCase().includes('firefox') ?? false)) {
        delete filteredHeaders.te;
    }

    return filteredHeaders;
}
