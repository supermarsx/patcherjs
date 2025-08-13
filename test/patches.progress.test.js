import { jest } from '@jest/globals';
import fs from 'fs';
import { join } from 'path';

const patchDir = join('patch_files');
const patchPath = join(patchDir, 'progress.patch');
const testBinPath = join('test', 'progress.bin');

describe('Patches progress logging', () => {
  beforeAll(() => {
    fs.mkdirSync('test', { recursive: true });
    fs.mkdirSync(patchDir, { recursive: true });
    fs.writeFileSync(testBinPath, Buffer.from([0x00, 0x00, 0x00]));
    fs.writeFileSync(patchPath, [
      '00000000: 00 11',
      '00000001: 00 22',
      '00000002: 00 33',
      ''
    ].join('\n'));
  });

  afterAll(() => {
    fs.rmSync(testBinPath, { force: true });
    fs.rmSync(patchPath, { force: true });
  });

  test('emits progress messages at configured intervals', async () => {
    jest.resetModules();
    const logInfo = jest.fn();
    jest.unstable_mockModule('../source/lib/auxiliary/logger.ts', () => ({
      default: { logInfo, logWarn: jest.fn(), logError: jest.fn(), logSuccess: jest.fn() }
    }));

    const { Patches } = await import('../source/lib/patches/patches.ts');
    const { ConfigurationDefaults } = await import('../source/lib/configuration/configuration.defaults.ts');

    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    config.patches = [
      { name: 'progress', patchFilename: 'progress.patch', fileNamePath: testBinPath, enabled: true }
    ];
    const pOpts = config.options.patches;
    pOpts.backupFiles = false;
    pOpts.fileSizeCheck = false;
    pOpts.skipWritingBinary = false;
    pOpts.warnOnUnexpectedPreviousValue = false;
    pOpts.failOnUnexpectedPreviousValue = false;
    pOpts.runPatches = true;

    config.options.general.progressInterval = 1;

    await Patches.runPatches({ configuration: config });

    const progressMessages = logInfo.mock.calls.flat().filter(m => m.startsWith('Processed'));
    expect(progressMessages).toEqual([
      'Processed 1/3 patches',
      'Processed 2/3 patches',
      'Processed 3/3 patches'
    ]);
  });
});
