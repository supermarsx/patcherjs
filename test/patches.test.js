import { Patches } from '../source/lib/patches/patches.ts';
import { ConfigurationDefaults } from '../source/lib/configuration/configuration.defaults.ts';
import fs from 'fs';
import { join } from 'path';

const patchDir = join('patch_files');
const testPatchPath = join(patchDir, 'test.patch');
const testBinPath = join('test', 'tmp.bin');

describe('Patches.runPatches', () => {
  beforeAll(() => {
    fs.mkdirSync('test', { recursive: true });
    fs.mkdirSync(patchDir, { recursive: true });
    fs.writeFileSync(testBinPath, Buffer.from([0x00]));
    fs.writeFileSync(testPatchPath, '00000000: 00 ff\n');
  });

  afterAll(() => {
    fs.rmSync(testBinPath, { force: true });
    fs.rmSync(testPatchPath, { force: true });
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

  test('patches using 64bit offsets flag', async () => {
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
    pOpts.use64BitOffsets = true;

    fs.writeFileSync(testBinPath, Buffer.from([0x00]));
    await Patches.runPatches({ configuration: config });
    const data = fs.readFileSync(testBinPath);
    expect(data[0]).toBe(0xff);
  });
});
