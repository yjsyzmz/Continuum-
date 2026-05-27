import { inflateRawSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const zipPath = process.argv[2];

if (!zipPath) {
  console.error('Usage: node scripts/validate-cws-package.mjs <zip-path>');
  process.exit(1);
}

const buffer = readFileSync(zipPath);
const entries = readZipEntries(buffer);
const names = entries.map((entry) => entry.name);
const errors = [];
const warnings = [];

const manifestEntries = entries.filter((entry) => entry.name === 'manifest.json');
if (manifestEntries.length !== 1) {
  errors.push(`Expected exactly one root manifest.json, found ${manifestEntries.length}.`);
}

if (names.some((name) => name.startsWith(`${basename(zipPath, '.zip')}/`))) {
  errors.push('Zip appears to contain a top-level folder. manifest.json must be at the zip root.');
}

if (names.some((name) => name.includes('\\'))) {
  errors.push('Zip contains backslash paths. Use forward-slash paths inside the archive.');
}

let manifest;
if (manifestEntries[0]) {
  try {
    manifest = JSON.parse(readEntryContent(buffer, manifestEntries[0]).toString('utf8'));
  } catch (error) {
    errors.push(`manifest.json is not valid JSON: ${error.message}`);
  }
}

if (manifest) {
  if (manifest.manifest_version !== 3) {
    errors.push(`Expected manifest_version 3, found ${manifest.manifest_version}.`);
  }
  if (!manifest.name || manifest.name.length > 45) {
    errors.push('Manifest name must be present and 45 characters or fewer.');
  }
  if (!manifest.description || manifest.description.length > 132) {
    errors.push('Manifest description must be present and 132 characters or fewer.');
  }
  if (!isValidChromeVersion(manifest.version)) {
    errors.push(
      `Manifest version "${manifest.version}" is invalid. Use 1-4 dot-separated integers, not all zero.`,
    );
  }

  const requiredPaths = [
    manifest.action?.default_popup,
    manifest.background?.service_worker,
    ...(manifest.content_scripts ?? []).flatMap((script) => script.js ?? []),
    ...Object.values(manifest.icons ?? {}),
  ].filter(Boolean);

  for (const path of requiredPaths) {
    if (!names.includes(path)) {
      errors.push(`Manifest references missing file: ${path}`);
    }
  }

  const broadPermissions = (manifest.permissions ?? []).filter((permission) =>
    ['scripting', 'storage', 'tabs', '<all_urls>'].includes(permission),
  );
  if (broadPermissions.length > 0) {
    warnings.push(`Review broad permissions before upload: ${broadPermissions.join(', ')}`);
  }
}

if (names.some((name) => name.endsWith('.map'))) {
  warnings.push('Zip includes source maps. Consider excluding them for store upload.');
}

if (warnings.length) {
  console.warn('Warnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length) {
  console.error('Chrome Web Store package validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Chrome Web Store package looks upload-ready: ${zipPath}`);
console.log(`Entries: ${entries.length}`);
if (manifest) {
  console.log(`Manifest: ${manifest.name} ${manifest.version}`);
}

function isValidChromeVersion(version) {
  if (typeof version !== 'string') return false;
  const parts = version.split('.');
  if (parts.length < 1 || parts.length > 4) return false;
  if (parts.some((part) => !/^(0|[1-9]\d*)$/.test(part))) return false;
  const numbers = parts.map(Number);
  if (numbers.some((part) => part < 0 || part > 65535)) return false;
  return numbers.some((part) => part !== 0);
}

function readZipEntries(data) {
  const eocdOffset = findEndOfCentralDirectory(data);
  const centralDirectorySize = data.readUInt32LE(eocdOffset + 12);
  const centralDirectoryOffset = data.readUInt32LE(eocdOffset + 16);
  const end = centralDirectoryOffset + centralDirectorySize;
  const entries = [];
  let offset = centralDirectoryOffset;

  while (offset < end) {
    if (data.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error('Invalid ZIP central directory.');
    }

    const compressionMethod = data.readUInt16LE(offset + 10);
    const compressedSize = data.readUInt32LE(offset + 20);
    const uncompressedSize = data.readUInt32LE(offset + 24);
    const fileNameLength = data.readUInt16LE(offset + 28);
    const extraLength = data.readUInt16LE(offset + 30);
    const commentLength = data.readUInt16LE(offset + 32);
    const localHeaderOffset = data.readUInt32LE(offset + 42);
    const name = data
      .subarray(offset + 46, offset + 46 + fileNameLength)
      .toString('utf8');

    entries.push({
      name,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function readEntryContent(data, entry) {
  const offset = entry.localHeaderOffset;
  if (data.readUInt32LE(offset) !== 0x04034b50) {
    throw new Error(`Invalid local header for ${entry.name}.`);
  }

  const fileNameLength = data.readUInt16LE(offset + 26);
  const extraLength = data.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  const compressed = data.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.compressionMethod === 0) return compressed;
  if (entry.compressionMethod === 8) return inflateRawSync(compressed);
  throw new Error(`Unsupported compression method ${entry.compressionMethod}.`);
}

function findEndOfCentralDirectory(data) {
  const minOffset = Math.max(0, data.length - 0xffff - 22);
  for (let offset = data.length - 22; offset >= minOffset; offset -= 1) {
    if (data.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  throw new Error('End of central directory not found. Not a valid ZIP file.');
}
