/**
 * A minimal ZIP reader and writer built on `node:zlib`, so the network definition files (which are
 * shipped as ZIP archives and shared with the Python ecosystem) can be read without a dependency.
 *
 * It supports what those files need: "stored" and "deflate" entries, no encryption, no ZIP64.
 * @module
 */
import { crc32, deflateRawSync, inflateRawSync } from 'node:zlib';

const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;

const END_OF_CENTRAL_DIRECTORY_SIZE = 22;
const LOCAL_FILE_HEADER_SIZE = 30;
const CENTRAL_DIRECTORY_HEADER_SIZE = 46;
/** The end of central directory record is followed by a comment of at most 64 KiB. */
const MAX_COMMENT_SIZE = 0xffff;

const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;

const FLAG_ENCRYPTED = 0x1;
const FLAG_UTF8_NAMES = 0x800;

/** 1980-01-01 00:00:00, the DOS epoch - a fixed timestamp keeps the archives reproducible. */
const DOS_TIME = 0;
const DOS_DATE = (1 << 5) | 1; // year 1980 (0 << 9), month 1, day 1

export interface ZipEntry {
    /** Path of the file inside of the archive. */
    name: string;
    /** Uncompressed content of the file. */
    data: Buffer;
}

/**
 * Reads the files of a ZIP archive (directory entries are skipped).
 * @param archive Content of the `.zip` file.
 */
export function readZip(archive: Buffer): ZipEntry[] {
    const endOfCentralDirectory = findEndOfCentralDirectory(archive);

    const entryCount = archive.readUInt16LE(endOfCentralDirectory + 10);
    let offset = archive.readUInt32LE(endOfCentralDirectory + 16);

    if (entryCount === 0xffff || offset === 0xffffffff) {
        throw new Error('ZIP64 archives are not supported.');
    }

    const entries: ZipEntry[] = [];

    for (let i = 0; i < entryCount; i++) {
        if (
            offset + CENTRAL_DIRECTORY_HEADER_SIZE > archive.length ||
            archive.readUInt32LE(offset) !== CENTRAL_DIRECTORY_SIGNATURE
        ) {
            throw new Error('Invalid ZIP archive: corrupted central directory.');
        }

        const flags = archive.readUInt16LE(offset + 8);
        const method = archive.readUInt16LE(offset + 10);
        const expectedCrc = archive.readUInt32LE(offset + 16);
        const compressedSize = archive.readUInt32LE(offset + 20);
        const nameLength = archive.readUInt16LE(offset + 28);
        const extraLength = archive.readUInt16LE(offset + 30);
        const commentLength = archive.readUInt16LE(offset + 32);
        const localHeaderOffset = archive.readUInt32LE(offset + 42);
        const name = archive.toString(
            'utf8',
            offset + CENTRAL_DIRECTORY_HEADER_SIZE,
            offset + CENTRAL_DIRECTORY_HEADER_SIZE + nameLength,
        );

        offset += CENTRAL_DIRECTORY_HEADER_SIZE + nameLength + extraLength + commentLength;

        if (name.endsWith('/')) continue;

        if (flags & FLAG_ENCRYPTED) {
            throw new Error(`Encrypted ZIP entries are not supported: ${name}`);
        }

        if (
            localHeaderOffset + LOCAL_FILE_HEADER_SIZE > archive.length ||
            archive.readUInt32LE(localHeaderOffset) !== LOCAL_FILE_HEADER_SIGNATURE
        ) {
            throw new Error(`Invalid ZIP archive: corrupted local header of ${name}`);
        }

        // The sizes are taken from the central directory, which is always complete (unlike the local header with data descriptors).
        const dataStart =
            localHeaderOffset +
            LOCAL_FILE_HEADER_SIZE +
            archive.readUInt16LE(localHeaderOffset + 26) +
            archive.readUInt16LE(localHeaderOffset + 28);
        const compressed = archive.subarray(dataStart, dataStart + compressedSize);

        let data: Buffer;
        if (method === METHOD_STORED) {
            data = Buffer.from(compressed);
        } else if (method === METHOD_DEFLATE) {
            data = inflateRawSync(compressed);
        } else {
            throw new Error(`Unsupported ZIP compression method ${method} of ${name}`);
        }

        if (crc32(data) !== expectedCrc) {
            throw new Error(`Invalid ZIP archive: CRC mismatch of ${name}`);
        }

        entries.push({ name, data });
    }

    return entries;
}

/**
 * Creates a ZIP archive with the given files.
 * @param entries Files to be put into the archive.
 */
export function createZip(entries: ZipEntry[]): Buffer {
    const localParts: Buffer[] = [];
    const centralParts: Buffer[] = [];
    let localSize = 0;

    for (const { name, data } of entries) {
        const nameBuffer = Buffer.from(name, 'utf8');
        const deflated = deflateRawSync(data, { level: 9 });
        const useDeflate = deflated.length < data.length;
        const content = useDeflate ? deflated : data;
        const method = useDeflate ? METHOD_DEFLATE : METHOD_STORED;
        const versionNeeded = useDeflate ? 20 : 10;
        const checksum = crc32(data);

        const local = Buffer.alloc(LOCAL_FILE_HEADER_SIZE + nameBuffer.length);
        local.writeUInt32LE(LOCAL_FILE_HEADER_SIGNATURE, 0);
        local.writeUInt16LE(versionNeeded, 4);
        local.writeUInt16LE(FLAG_UTF8_NAMES, 6);
        local.writeUInt16LE(method, 8);
        local.writeUInt16LE(DOS_TIME, 10);
        local.writeUInt16LE(DOS_DATE, 12);
        local.writeUInt32LE(checksum, 14);
        local.writeUInt32LE(content.length, 18);
        local.writeUInt32LE(data.length, 22);
        local.writeUInt16LE(nameBuffer.length, 26);
        nameBuffer.copy(local, LOCAL_FILE_HEADER_SIZE);

        const central = Buffer.alloc(CENTRAL_DIRECTORY_HEADER_SIZE + nameBuffer.length);
        central.writeUInt32LE(CENTRAL_DIRECTORY_SIGNATURE, 0);
        central.writeUInt16LE(versionNeeded, 4);
        central.writeUInt16LE(versionNeeded, 6);
        central.writeUInt16LE(FLAG_UTF8_NAMES, 8);
        central.writeUInt16LE(method, 10);
        central.writeUInt16LE(DOS_TIME, 12);
        central.writeUInt16LE(DOS_DATE, 14);
        central.writeUInt32LE(checksum, 16);
        central.writeUInt32LE(content.length, 20);
        central.writeUInt32LE(data.length, 24);
        central.writeUInt16LE(nameBuffer.length, 28);
        central.writeUInt32LE(localSize, 42);
        nameBuffer.copy(central, CENTRAL_DIRECTORY_HEADER_SIZE);

        localParts.push(local, content);
        centralParts.push(central);
        localSize += local.length + content.length;
    }

    const centralDirectory = Buffer.concat(centralParts);
    const end = Buffer.alloc(END_OF_CENTRAL_DIRECTORY_SIZE);
    end.writeUInt32LE(END_OF_CENTRAL_DIRECTORY_SIGNATURE, 0);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(centralDirectory.length, 12);
    end.writeUInt32LE(localSize, 16);

    if (entries.length >= 0xffff || localSize + centralDirectory.length >= 0xffffffff) {
        throw new Error('ZIP64 archives are not supported.');
    }

    return Buffer.concat([...localParts, centralDirectory, end]);
}

function findEndOfCentralDirectory(archive: Buffer): number {
    const lowest = Math.max(0, archive.length - END_OF_CENTRAL_DIRECTORY_SIZE - MAX_COMMENT_SIZE);

    for (let offset = archive.length - END_OF_CENTRAL_DIRECTORY_SIZE; offset >= lowest; offset--) {
        if (archive.readUInt32LE(offset) === END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
            return offset;
        }
    }

    throw new Error('Invalid ZIP archive: end of central directory not found.');
}
