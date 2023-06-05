import { inspect } from 'util';
import { HeaderGenerator, HeaderGeneratorOptions } from 'header-generator';
import headersOrder from 'header-generator/src/data_files/headers-order.json';
import { getUserAgent, getBrowser } from 'header-generator/src/utils';

function extractLocalesFromAcceptLanguageHeader(acceptLanguageHeader: string): string[] {
    const extractedLocales = [];
    const localesWithWeight = acceptLanguageHeader.split(',');
    for (const localeWithWeight of localesWithWeight) {
        const locale = localeWithWeight.split(';')[0].trim();
        extractedLocales.push(locale);
    }

    return extractedLocales;
}

describe('Generation tests', () => {
    const headerGenerator = new HeaderGenerator({
        httpVersion: '2',
    });

    test('Generates headers basic', () => {
        const headers = headerGenerator.getHeaders();
        // This gets the first user-agent header regardless of casing
        const userAgent = getUserAgent(headers);
        const browser = getBrowser(userAgent);

        expect(typeof headers).toBe('object');

        const order = headersOrder[browser!];

        // -1 is the index if an entry doesn't exist, so keep this by default
        let index = -1;
        for (const header of Object.keys(headers)) {
            const newIndex = order.indexOf(header);

            // Make the log readable via `inspect`
            const log = `${userAgent}\n${browser}\n${inspect(order)}\n${inspect(headers)}`;
            if (newIndex === -1) {
                // If the header isn't in the order list, throw an error
                // throw new Error(`Missing entry in order array\n${log}`);
                continue;
            } else if (newIndex < index) {
                // If the index of the header is earlier than the remembered index then throw an error. Example:
                // given order:
                // Connection = 0
                // connection = 1
                // User-Agent = 2
                // user-agent = 3
                //
                // headers:
                // User-Agent: ... (remembered index: -1, current index: 2)
                // Connection: ... (remembered index: 2, current index: 0)
                //
                // 0 < 2 so it will throw.
                throw new Error(`Header ${header} out of order\n${log}`);
            }

            index = newIndex;
        }
    });

    test('Accepts custom headers', () => {
        const headers = headerGenerator.getHeaders({
            httpVersion: '1',
        }, {
            'x-custom': 'foobar',
        });

        const keys = Object.keys(headers);
        expect(keys.indexOf('x-custom')).toBe(keys.length - 1);
    });

    test('Orders headers', () => {
        const headers = {
            bar: 'foo',
            foo: 'bar',
            connection: 'keep-alive',
        };

        const order = [
            'connection',
            'foo',
            'bar',
        ];

        const generator = new HeaderGenerator();
        const ordered = generator.orderHeaders(headers, order);
        expect(ordered).toEqual(headers);
        expect(Object.keys(ordered)).toEqual(order);
    });

    test('Orders headers depending on user-agent', () => {
        const headers = {
            'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36',
            cookie: 'test=123',
            Connection: 'keep-alive',
        };

        const generator = new HeaderGenerator();
        const ordered = generator.orderHeaders(headers);
        expect(ordered).toEqual(headers);
        expect(Object.keys(ordered)).toEqual(['Connection', 'user-agent', 'cookie']);
    });

    test('Orders headers works without user-agent', () => {
        const headers = {
            cookie: 'test=123',
            Connection: 'keep-alive',
        };

        const generator = new HeaderGenerator();
        const ordered = generator.orderHeaders(headers);
        expect(ordered).toEqual(headers);
        expect(Object.keys(ordered)).toEqual(Object.keys(headers));
    });

    test('Options from getHeaders override options from the constructor', () => {
        const headers = headerGenerator.getHeaders({
            httpVersion: '1',
        });
        expect('Accept-Language' in headers).toBeTruthy();
    });

    test('Generates headers with the requested locales', () => {
        const requestedLocales = ['en', 'es', 'en-GB'];
        const headers = headerGenerator.getHeaders({
            httpVersion: '2',
            locales: requestedLocales,
        });
        const extractedLocales = extractLocalesFromAcceptLanguageHeader(headers['accept-language']);
        expect(requestedLocales.sort()).toEqual(extractedLocales.sort());
    });

    test('Generates headers consistent with browsers input', () => {
        const headers = headerGenerator.getHeaders({
            httpVersion: '2',
            browsers: [{ name: 'edge' }],
        });
        expect(/edg/.test(headers['user-agent'].toLowerCase())).toBeTruthy();
    });

    test('Generates headers consistent with operating systems input', () => {
        const headers = headerGenerator.getHeaders({
            httpVersion: '2',
            operatingSystems: ['linux'],
        });
        expect(/linux/.test(headers['user-agent'].toLowerCase())).toBeTruthy();
    });

    test('Generates headers consistent with devices input', () => {
        const headers = headerGenerator.getHeaders({
            httpVersion: '2',
            devices: ['mobile'],
        });
        expect(/phone|android|mobile/i.test(headers['user-agent'])).toBeTruthy();
    });

    test('Throws an error when nothing can be generated', () => {
        try {
            headerGenerator.getHeaders({
                browsers: [{
                    name: 'non-existing-browser',
                }],
            } as unknown as HeaderGeneratorOptions);
            fail("HeaderGenerator didn't throw an error when trying to generate headers for a nonexisting browser.");
        } catch (error) {
            expect(error)
                .toEqual(
                    new Error('No headers based on this input can be generated. Please relax or change some of the requirements you specified.'),
                );
        }
    });

    test('Supports browserListQuery generation', () => {
        const headers = headerGenerator.getHeaders({
            browserListQuery: 'last 15 firefox versions',
            httpVersion: '2',
        });
        expect(headers['user-agent'].includes('Firefox')).toBeTruthy();
    });

    describe('Allow using strings instead of complex browser objects', () => {
        test('in constructor', () => {
            const generator = new HeaderGenerator({
                browsers: ['chrome'],
            });
            const headers = generator.getHeaders();
            expect(headers['user-agent'].includes('Chrome')).toBe(true);
        });

        test('in getHeaders', () => {
            const headers = headerGenerator.getHeaders({
                browsers: ['firefox'],
            });
            expect(headers['user-agent'].includes('Firefox')).toBe(true);
        });
    });
});
