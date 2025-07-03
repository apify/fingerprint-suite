import browsersList from 'browserslist';
import { getBrowsersFromQuery } from 'header-generator/src/utils';

import { describe, expect, test } from 'vitest';

describe('browserList generation', () => {
    test('Should work with simple query', () => {
        const browsers = getBrowsersFromQuery('last 2 firefox versions');
        expect(browsers).toHaveLength(1);
        expect(browsers[0].name).toBe('firefox');
    });

    test('Should work with advanced query - aggregate versions', () => {
        const browsers = getBrowsersFromQuery('cover 99.5%');
        const browserList = browsersList('cover 99.5%');
        expect(browsers.length < browserList.length).toBe(true);
    });
});
