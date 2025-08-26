import fs from 'fs';
import { join } from 'path';
import { jest } from '@jest/globals';

const patchDir = join('patch_files');
const patchPath = join(patchDir, 'progress.patch');
const testBinPath = join('test', 'progress.bin');

describe('Patches progress events', () => {
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

  test('emits progress for buffer patches', async () => {
    jest.resetModules();
    const { Patcher } = await import('../source/lib/composites.ts');
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

    const events = [];
    Patcher.patchEmitter.on('progress', e => events.push(e));

    await Patcher.runPatches({ configuration: config });

    Patcher.patchEmitter.removeAllListeners('progress');

    expect(events).toEqual([
      { processed: 1, total: 3 },
      { processed: 2, total: 3 },
      { processed: 3, total: 3 }
    ]);
  });

});
