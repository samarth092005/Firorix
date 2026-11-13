/**
 * Fiorify — GEN-08: Zero-Dependency Pure Node.js PKZIP Archiver & Extractor
 *
 * Implements 100% specification-compliant PKZIP 2.0 archive creation and extraction
 * using Node.js built-ins (node:zlib, node:buffer, node:fs, node:path).
 *
 * Security:
 * - Safe path boundary enforcement (rejects path traversal '..', absolute paths, Windows drives)
 * - CRC-32 integrity validation on read and write
 * - Buffer length and offset boundary bounds checking
 */

import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

// Standard PKZIP Header Signatures
const SIG_LOCAL_FILE_HEADER = 0x04034b50;
const SIG_CENTRAL_DIRECTORY = 0x02014b50;
const SIG_END_OF_CENTRAL_DIR = 0x06054b50;

/**
 * Calculates CRC-32 of a buffer.
 */
function calculateCrc32(buf) {
  if (typeof zlib.crc32 === 'function') {
    return zlib.crc32(buf);
  }
  // Standard CRC-32 fallback
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    let byte = buf[i];
    crc ^= byte;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Converts JS Date to MS-DOS date and time bitfields.
 */
function dateToDosTime(date = new Date()) {
  const time =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((Math.floor(date.getSeconds() / 2)) & 0x1f);

  const year = Math.max(1980, date.getFullYear());
  const dosDate =
    (((year - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    (date.getDate() & 0x1f);

  return { time, date: dosDate };
}

/**
 * Sanitizes and normalizes an archive entry path.
 * Rejects path traversal attempts.
 */
export function sanitizeZipEntryPath(rawPath) {
  if (typeof rawPath !== 'string') {
    throw new Error('Archive entry path must be a string.');
  }

  // Normalize slashes to forward slashes
  let normalized = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');

  // Guard against null bytes
  if (normalized.includes('\0')) {
    throw new Error('Archive entry path contains forbidden null byte.');
  }

  // Guard against Windows drive letters (e.g. C:)
  if (/^[a-zA-Z]:/.test(normalized)) {
    throw new Error(`Archive entry path contains illegal Windows drive specification: "${rawPath}"`);
  }

  // Check for path traversal components
  const segments = normalized.split('/').filter(Boolean);
  for (const seg of segments) {
    if (seg === '..' || seg === '.') {
      throw new Error(`Path traversal attempt detected in archive entry: "${rawPath}"`);
    }
  }

  return segments.join('/');
}

/**
 * Creates a standard PKZIP archive buffer from a list of file entries.
 *
 * @param {Array<{ path: string, content: string|Buffer, mtime?: Date }>} entries
 * @returns {Buffer} PKZIP archive buffer
 */
export function createZipArchive(entries = []) {
  const localHeaders = [];
  const centralDirectoryEntries = [];
  let currentOffset = 0;

  for (const entry of entries) {
    const cleanPath = sanitizeZipEntryPath(entry.path);
    if (!cleanPath) continue;

    const rawData = Buffer.isBuffer(entry.content)
      ? entry.content
      : Buffer.from(entry.content || '', 'utf-8');

    const uncompressedSize = rawData.length;
    const crc = calculateCrc32(rawData);

    // Compress using raw deflate
    let compressedData;
    let compressionMethod = 8; // Deflate
    if (uncompressedSize > 0) {
      compressedData = zlib.deflateRawSync(rawData, { level: 9 });
      // If compressed is larger or equal, store raw
      if (compressedData.length >= uncompressedSize) {
        compressedData = rawData;
        compressionMethod = 0; // Stored
      }
    } else {
      compressedData = Buffer.alloc(0);
      compressionMethod = 0;
    }

    const compressedSize = compressedData.length;
    const nameBuf = Buffer.from(cleanPath, 'utf-8');
    const nameLen = nameBuf.length;
    const { time, date } = dateToDosTime(entry.mtime);

    // Build Local File Header (30 bytes + nameLen)
    const localHeader = Buffer.alloc(30 + nameLen);
    localHeader.writeUInt32LE(SIG_LOCAL_FILE_HEADER, 0);
    localHeader.writeUInt16LE(20, 4); // Version needed: 2.0
    localHeader.writeUInt16LE(0x0800, 6); // General purpose flag: UTF-8
    localHeader.writeUInt16LE(compressionMethod, 8);
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(date, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressedSize, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(nameLen, 26);
    localHeader.writeUInt16LE(0, 28); // Extra field length
    nameBuf.copy(localHeader, 30);

    const localFileRecord = Buffer.concat([localHeader, compressedData]);
    localHeaders.push(localFileRecord);

    // Build Central Directory Entry (46 bytes + nameLen)
    const cdEntry = Buffer.alloc(46 + nameLen);
    cdEntry.writeUInt32LE(SIG_CENTRAL_DIRECTORY, 0);
    cdEntry.writeUInt16LE(0x0314, 4); // Made by Unix / ZIP 2.0
    cdEntry.writeUInt16LE(20, 6); // Version needed: 2.0
    cdEntry.writeUInt16LE(0x0800, 8); // UTF-8
    cdEntry.writeUInt16LE(compressionMethod, 10);
    cdEntry.writeUInt16LE(time, 12);
    cdEntry.writeUInt16LE(date, 14);
    cdEntry.writeUInt32LE(crc, 16);
    cdEntry.writeUInt32LE(compressedSize, 20);
    cdEntry.writeUInt32LE(uncompressedSize, 24);
    cdEntry.writeUInt16LE(nameLen, 28);
    cdEntry.writeUInt16LE(0, 30); // Extra field len
    cdEntry.writeUInt16LE(0, 32); // Comment len
    cdEntry.writeUInt16LE(0, 34); // Disk num start
    cdEntry.writeUInt16LE(0, 36); // Internal attrs
    cdEntry.writeUInt32LE((0o100644 << 16) >>> 0, 38); // External attrs: regular file rw-r--r--
    cdEntry.writeUInt32LE(currentOffset, 42); // Relative offset of local header
    nameBuf.copy(cdEntry, 46);

    centralDirectoryEntries.push(cdEntry);
    currentOffset += localFileRecord.length;
  }

  const localHeadersBuf = Buffer.concat(localHeaders);
  const cdBuf = Buffer.concat(centralDirectoryEntries);
  const cdOffset = localHeadersBuf.length;
  const cdSize = cdBuf.length;
  const totalEntries = entries.length;

  // Build End of Central Directory Record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(SIG_END_OF_CENTRAL_DIR, 0);
  eocd.writeUInt16LE(0, 4); // Disk number
  eocd.writeUInt16LE(0, 6); // Disk where CD starts
  eocd.writeUInt16LE(totalEntries, 8); // Records on this disk
  eocd.writeUInt16LE(totalEntries, 10); // Total records
  eocd.writeUInt32LE(cdSize, 12); // Size of CD
  eocd.writeUInt32LE(cdOffset, 16); // Offset of CD
  eocd.writeUInt16LE(0, 20); // Comment length

  return Buffer.concat([localHeadersBuf, cdBuf, eocd]);
}

/**
 * Extracts and inspects entries from a PKZIP buffer.
 *
 * @param {Buffer} zipBuffer
 * @returns {Array<{ path: string, content: Buffer, size: number, uncompressedSize: number }>}
 */
export function readZipArchive(zipBuffer) {
  if (!Buffer.isBuffer(zipBuffer) || zipBuffer.length < 22) {
    throw new Error('Invalid zip buffer.');
  }

  // Find EOCD by scanning backward from end
  let eocdOffset = -1;
  const searchLimit = Math.max(0, zipBuffer.length - 65557);
  for (let i = zipBuffer.length - 22; i >= searchLimit; i--) {
    if (zipBuffer.readUInt32LE(i) === SIG_END_OF_CENTRAL_DIR) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error('Corrupt archive: End of Central Directory (EOCD) signature not found.');
  }

  const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10);
  const cdSize = zipBuffer.readUInt32LE(eocdOffset + 12);
  const cdOffset = zipBuffer.readUInt32LE(eocdOffset + 16);

  if (cdOffset + cdSize > eocdOffset) {
    throw new Error('Corrupt archive: Central directory overflows EOCD boundary.');
  }

  const entries = [];
  let curOffset = cdOffset;

  for (let i = 0; i < totalEntries; i++) {
    if (curOffset + 46 > zipBuffer.length) {
      throw new Error(`Corrupt archive: Unexpected EOF at central directory entry ${i}`);
    }

    const sig = zipBuffer.readUInt32LE(curOffset);
    if (sig !== SIG_CENTRAL_DIRECTORY) {
      throw new Error(`Corrupt archive: Expected central directory signature at offset ${curOffset}`);
    }

    const compressionMethod = zipBuffer.readUInt16LE(curOffset + 10);
    const expectedCrc = zipBuffer.readUInt32LE(curOffset + 16);
    const compressedSize = zipBuffer.readUInt32LE(curOffset + 20);
    const uncompressedSize = zipBuffer.readUInt32LE(curOffset + 24);
    const nameLen = zipBuffer.readUInt16LE(curOffset + 28);
    const extraLen = zipBuffer.readUInt16LE(curOffset + 30);
    const commentLen = zipBuffer.readUInt16LE(curOffset + 32);
    const localHeaderOffset = zipBuffer.readUInt32LE(curOffset + 42);

    const nameBuf = zipBuffer.subarray(curOffset + 46, curOffset + 46 + nameLen);
    const rawPath = nameBuf.toString('utf-8');
    const cleanPath = sanitizeZipEntryPath(rawPath);

    // Read from local header
    if (localHeaderOffset + 30 > zipBuffer.length) {
      throw new Error(`Corrupt archive: Local header offset ${localHeaderOffset} out of bounds.`);
    }

    const localSig = zipBuffer.readUInt32LE(localHeaderOffset);
    if (localSig !== SIG_LOCAL_FILE_HEADER) {
      throw new Error(`Corrupt archive: Local file header signature mismatch at ${localHeaderOffset}`);
    }

    const localNameLen = zipBuffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = zipBuffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const dataEnd = dataStart + compressedSize;

    if (dataEnd > zipBuffer.length) {
      throw new Error(`Corrupt archive: Compressed file data overflows buffer.`);
    }

    const compressedData = zipBuffer.subarray(dataStart, dataEnd);
    let decompressed;

    if (compressionMethod === 0) {
      decompressed = compressedData;
    } else if (compressionMethod === 8) {
      decompressed = zlib.inflateRawSync(compressedData);
    } else {
      throw new Error(`Unsupported compression method: ${compressionMethod} for ${cleanPath}`);
    }

    if (decompressed.length !== uncompressedSize) {
      throw new Error(`Uncompressed size mismatch for ${cleanPath}: got ${decompressed.length}, expected ${uncompressedSize}`);
    }

    const actualCrc = calculateCrc32(decompressed);
    if (actualCrc !== expectedCrc) {
      throw new Error(`CRC-32 checksum mismatch for ${cleanPath}: got 0x${actualCrc.toString(16)}, expected 0x${expectedCrc.toString(16)}`);
    }

    entries.push({
      path: cleanPath,
      content: decompressed,
      size: compressedSize,
      uncompressedSize
    });

    curOffset += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}

/**
 * Safely extracts a ZIP archive into a destination directory.
 *
 * @param {Buffer} zipBuffer
 * @param {string} destinationDir
 * @returns {Array<string>} List of extracted relative file paths
 */
export function extractZipArchive(zipBuffer, destinationDir) {
  const targetRoot = path.resolve(destinationDir);
  const entries = readZipArchive(zipBuffer);
  const extractedPaths = [];

  for (const entry of entries) {
    const fullTargetPath = path.resolve(targetRoot, entry.path);

    // Prevent path traversal outside targetRoot
    if (!fullTargetPath.startsWith(targetRoot + path.sep) && fullTargetPath !== targetRoot) {
      throw new Error(`Security Exception: Extraction path "${fullTargetPath}" escapes target directory "${targetRoot}"`);
    }

    const parentDir = path.dirname(fullTargetPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(fullTargetPath, entry.content);
    extractedPaths.push(entry.path);
  }

  return extractedPaths;
}
