import { Patches } from '../dist/lib/patches/patches.js';
import { ConfigurationDefaults } from '../dist/lib/configuration/configuration.defaults.js';
import fs from 'fs';

const patchDir = 'patch_files';
const testPatchPath = `${patchDir}\\test.patch`;
const testBinPath = 'test/tmp.bin';

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
});
