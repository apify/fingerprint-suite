import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createZip, readZip } from 'generative-bayesian-network/src/zip.js';
import { describe, expect, test } from 'vitest';

/**
 * Built with Python's `zipfile`: a directory entry, a stored file, a deflated file inside of the directory
 * and an archive comment, i.e. the things our own writer never produces.
 */
const PYTHON_ARCHIVE = Buffer.from(
    'UEsDBBQAAAAAAAViUF0AAAAAAAAAAAAAAAAEAAAAZGlyL1BLAwQUAAAAAAAAACEAHXPubQ4AAAAOAAAACgAAAHN0b3JlZC50eHRzdG9yZWQgY29udGVudFBLAwQUAAAACAAAACEA9WsDMw0AAAAYAQAAEQAAAGRpci9kZWZsYXRlZC5qc29uq1ZKVLIyrK0epVApAFBLAQIUAxQAAAAAAAViUF0AAAAAAAAAAAAAAAAEAAAAAAAAAAAAEAD9QQAAAABkaXIvUEsBAhQDFAAAAAAAAAAhAB1z7m0OAAAADgAAAAoAAAAAAAAAAAAAAIABIgAAAHN0b3JlZC50eHRQSwECFAMUAAAACAAAACEA9WsDMw0AAAAYAQAAEQAAAAAAAAAAAAAAgAFYAAAAZGlyL2RlZmxhdGVkLmpzb25QSwUGAAAAAAMAAwCpAAAAlAAAAA8AYXJjaGl2ZSBjb21tZW50',
    'base64',
);

describe('ZIP reader and writer', () => {
    test('round-trips deflated, stored and empty files', () => {
        const compressible = Buffer.from('{"nodes":[]}'.repeat(1000));
        const incompressible = randomBytes(256);
        const archive = createZip([
            { name: 'network.json', data: compressible },
            { name: 'random.bin', data: incompressible },
            { name: 'empty.txt', data: Buffer.alloc(0) },
            { name: 'ünïcode/ž.txt', data: Buffer.from('ok') },
        ]);

        const entries = readZip(archive);

        expect(entries.map(({ name }) => name)).toEqual([
            'network.json',
            'random.bin',
            'empty.txt',
            'ünïcode/ž.txt',
        ]);
        expect(entries[0].data.equals(compressible)).toBe(true);
        expect(entries[1].data.equals(incompressible)).toBe(true);
        expect(entries[2].data).toHaveLength(0);
        expect(entries[3].data.toString()).toBe('ok');
        // compressible data is deflated, random data is stored as it is
        expect(archive.length).toBeLessThan(
            compressible.length + incompressible.length,
        );
    });

    test('output is reproducible', () => {
        const entries = [{ name: 'a.txt', data: Buffer.from('a'.repeat(100)) }];

        expect(createZip(entries).equals(createZip(entries))).toBe(true);
    });

    test('reads an archive made by another implementation', () => {
        const entries = readZip(PYTHON_ARCHIVE);

        // directory entries are skipped, stored and deflated files are read
        expect(entries.map(({ name }) => name)).toEqual([
            'stored.txt',
            'dir/deflated.json',
        ]);
        expect(entries[0].data.toString()).toBe('stored content');
        expect(entries[1].data.toString()).toBe('{"a":1}'.repeat(40));
    });

    test('reads the network definitions shipped in the packages', () => {
        const [entry] = readZip(
            readFileSync(
                join(
                    import.meta.dirname,
                    '../../packages/header-generator/src/data_files/input-network-definition.zip',
                ),
            ),
        );

        expect(Array.isArray(JSON.parse(entry.data.toString()).nodes)).toBe(
            true,
        );
    });

    test.each([
        ['not an archive', Buffer.from('definitely not a zip file')],
        [
            'a truncated archive',
            createZip([{ name: 'a', data: randomBytes(64) }]).subarray(0, 60),
        ],
    ])('rejects %s', (_, archive) => {
        expect(() => readZip(archive)).toThrow(/Invalid ZIP archive/);
    });

    test('detects corrupted content', () => {
        const archive = createZip([{ name: 'a', data: randomBytes(64) }]);
        // flips a byte of the (stored) file content, right after the 30 + 1 bytes of the local header
        archive[31 + 10] ^= 0xff;

        expect(() => readZip(archive)).toThrow(/CRC mismatch/);
    });

    test('rejects unsupported compression methods and encryption', () => {
        const data = Buffer.from('x');
        const archive = createZip([{ name: 'a', data }]);
        const centralDirectory = archive.lastIndexOf(
            Buffer.from([0x50, 0x4b, 0x01, 0x02]),
        );

        const unsupportedMethod = Buffer.from(archive);
        unsupportedMethod.writeUInt16LE(14, centralDirectory + 10); // LZMA
        expect(() => readZip(unsupportedMethod)).toThrow(
            /Unsupported ZIP compression method/,
        );

        const encrypted = Buffer.from(archive);
        encrypted.writeUInt16LE(0x1, centralDirectory + 8);
        expect(() => readZip(encrypted)).toThrow(/Encrypted ZIP entries/);
    });
});
