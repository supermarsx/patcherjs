import { Patches } from '../source/lib/patches/patches.ts';
import { ConfigurationDefaults } from '../source/lib/configuration/configuration.defaults.ts';
import fs from 'fs';
import { join } from 'path';

const patchDir = join('patch_files');
const testPatchPath = join(patchDir, 'test.patch');
const bigPatchPath = join(patchDir, 'big.patch');
const multiPatchPath = join(patchDir, 'multi.patch');
const endPatchPath = join(patchDir, 'end.patch');
const overflowPatchPath = join(patchDir, 'overflow.patch');
const testBinPath = join('test', 'tmp.bin');

describe('Patches.runPatches', () => {
  beforeAll(() => {
    fs.mkdirSync('test', { recursive: true });
    fs.mkdirSync(patchDir, { recursive: true });
    fs.writeFileSync(testBinPath, Buffer.from([0x00]));
    fs.writeFileSync(testPatchPath, '00000000: 00 ff\n');
    fs.writeFileSync(bigPatchPath, '100000000: 00 ff\n');
    fs.writeFileSync(multiPatchPath, [
      '00000000: 0000 1234',
      '00000002: 00000000 89abcdef',
      '00000006: 0000000000000000 1122334455667788',
      ''
    ].join('\n'));
    fs.writeFileSync(endPatchPath, '00000001: 01 aa\n');
    fs.writeFileSync(overflowPatchPath, '00000002: 00 ff\n');
  });

  afterAll(() => {
    fs.rmSync(testBinPath, { force: true });
    fs.rmSync(testPatchPath, { force: true });
    fs.rmSync(bigPatchPath, { force: true });
    fs.rmSync(multiPatchPath, { force: true });
    fs.rmSync(endPatchPath, { force: true });
    fs.rmSync(overflowPatchPath, { force: true });
  });

  test('patches a binary file', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    config.patches = [
      { name: 'test', patchFilename: 'test.patch', fileNamePath: testBinPath, enabled: true }
    ];
    const pOpts = config.options.patches;
    pOpts.backupFiles = false;
    pOpts.fileSizeCheck = false;
    pOpts.skipWritingBinary = false;
    pOpts.warnOnUnexpectedPreviousValue = false;
    pOpts.failOnUnexpectedPreviousValue = false;
    pOpts.runPatches = true;

    await Patches.runPatches({ configuration: config });
    const data = fs.readFileSync(testBinPath);
    expect(data[0]).toBe(0xff);
  });

  test('handles 64-bit offsets', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    fs.writeFileSync(testBinPath, Buffer.from([0x00]));
    config.patches = [
      { name: 'big', patchFilename: 'big.patch', fileNamePath: testBinPath, enabled: true }
    ];
    const pOpts = config.options.patches;
    pOpts.backupFiles = false;
    pOpts.fileSizeCheck = false;
    pOpts.skipWritingBinary = false;
    pOpts.warnOnUnexpectedPreviousValue = false;
    pOpts.failOnUnexpectedPreviousValue = false;
    pOpts.skipWritePatch = true;
    pOpts.runPatches = true;

    await Patches.runPatches({ configuration: config });
    const data = fs.readFileSync(testBinPath);
    expect(data[0]).toBe(0x00);
  });

  test('out-of-range offsets do not enlarge file', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    fs.writeFileSync(testBinPath, Buffer.from([0x00]));
    config.patches = [
      { name: 'big', patchFilename: 'big.patch', fileNamePath: testBinPath, enabled: true }
    ];
    const pOpts = config.options.patches;
    pOpts.backupFiles = false;
    pOpts.fileSizeCheck = false;
    pOpts.skipWritingBinary = false;
    pOpts.warnOnUnexpectedPreviousValue = false;
    pOpts.failOnUnexpectedPreviousValue = false;
    pOpts.allowOffsetOverflow = false;
    pOpts.runPatches = true;

    await Patches.runPatches({ configuration: config });
    const stats = fs.statSync(testBinPath);
    expect(stats.size).toBe(1);
  });

  test('patches multi-byte values', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    fs.writeFileSync(testBinPath, Buffer.alloc(14));
    config.patches = [
      { name: 'multi', patchFilename: 'multi.patch', fileNamePath: testBinPath, enabled: true }
    ];
    const pOpts = config.options.patches;
    pOpts.backupFiles = false;
    pOpts.fileSizeCheck = false;
    pOpts.skipWritingBinary = false;
    pOpts.warnOnUnexpectedPreviousValue = false;
    pOpts.failOnUnexpectedPreviousValue = false;
    pOpts.runPatches = true;

    await Patches.runPatches({ configuration: config });
    const data = fs.readFileSync(testBinPath);
    expect(data.readUInt16LE(0)).toBe(0x1234);
    expect(data.readUInt32LE(2)).toBe(0x89abcdef);
    expect(data.readBigUInt64LE(6)).toBe(0x1122334455667788n);
  });

  test('patches big-endian multi-byte values', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    fs.writeFileSync(testBinPath, Buffer.alloc(14));
    config.patches = [
      { name: 'multi', patchFilename: 'multi.patch', fileNamePath: testBinPath, enabled: true }
    ];
    const pOpts = config.options.patches;
    pOpts.backupFiles = false;
    pOpts.fileSizeCheck = false;
    pOpts.skipWritingBinary = false;
    pOpts.warnOnUnexpectedPreviousValue = false;
    pOpts.failOnUnexpectedPreviousValue = false;
    pOpts.bigEndian = true;
    pOpts.runPatches = true;

    await Patches.runPatches({ configuration: config });
    const data = fs.readFileSync(testBinPath);
    expect(data.readUInt16BE(0)).toBe(0x1234);
    expect(data.readUInt32BE(2)).toBe(0x89abcdef);
    expect(data.readBigUInt64BE(6)).toBe(0x1122334455667788n);
  });

  test('patches offset at end of file', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    fs.writeFileSync(testBinPath, Buffer.from([0x00, 0x01]));
    config.patches = [
      { name: 'end', patchFilename: 'end.patch', fileNamePath: testBinPath, enabled: true }
    ];
    const pOpts = config.options.patches;
    pOpts.backupFiles = false;
    pOpts.fileSizeCheck = false;
    pOpts.skipWritingBinary = false;
    pOpts.warnOnUnexpectedPreviousValue = false;
    pOpts.failOnUnexpectedPreviousValue = false;
    pOpts.runPatches = true;

    await Patches.runPatches({ configuration: config });
    const data = fs.readFileSync(testBinPath);
    expect(Array.from(data)).toEqual([0x00, 0xaa]);
  });

  test('offset equal to file size is ignored', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    fs.writeFileSync(testBinPath, Buffer.from([0x00, 0x01]));
    config.patches = [
      { name: 'overflow', patchFilename: 'overflow.patch', fileNamePath: testBinPath, enabled: true }
    ];
    const pOpts = config.options.patches;
    pOpts.backupFiles = false;
    pOpts.fileSizeCheck = false;
    pOpts.skipWritingBinary = false;
    pOpts.warnOnUnexpectedPreviousValue = false;
    pOpts.failOnUnexpectedPreviousValue = false;
    pOpts.allowOffsetOverflow = false;
    pOpts.runPatches = true;

    await Patches.runPatches({ configuration: config });
    const data = fs.readFileSync(testBinPath);
    expect(Array.from(data)).toEqual([0x00, 0x01]);
  });

  test('disabled patches are skipped', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    fs.writeFileSync(testBinPath, Buffer.from([0x00]));
    config.patches = [
      { name: 'test', patchFilename: 'test.patch', fileNamePath: testBinPath, enabled: false }
    ];
    const pOpts = config.options.patches;
    pOpts.backupFiles = false;
    pOpts.fileSizeCheck = false;
    pOpts.skipWritingBinary = false;
    pOpts.warnOnUnexpectedPreviousValue = false;
    pOpts.failOnUnexpectedPreviousValue = false;
    pOpts.runPatches = true;

    await Patches.runPatches({ configuration: config });
    const data = fs.readFileSync(testBinPath);
    expect(data[0]).toBe(0x00);
  });
});
