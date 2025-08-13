import { Patches } from '../source/lib/patches/patches.ts';
import { ConfigurationDefaults } from '../source/lib/configuration/configuration.defaults.ts';
import fs from 'fs';
import os from 'os';
import { join } from 'path';

const patchDir = join('patch_files');
const envPatchPath = join(patchDir, 'env.patch');

beforeAll(() => {
  fs.mkdirSync(patchDir, { recursive: true });
  fs.writeFileSync(envPatchPath, '00000000: 00 ff\n');
});

afterAll(() => {
  fs.rmSync(envPatchPath, { force: true });
});

function makeConfig(pathStr) {
  const config = ConfigurationDefaults.getDefaultConfigurationObject();
  config.patches = [
    { name: 'env', patchFilename: 'env.patch', fileNamePath: pathStr, enabled: true }
  ];
  const pOpts = config.options.patches;
  pOpts.backupFiles = false;
  pOpts.fileSizeCheck = false;
  pOpts.skipWritingBinary = false;
  pOpts.warnOnUnexpectedPreviousValue = false;
  pOpts.failOnUnexpectedPreviousValue = false;
  pOpts.runPatches = true;
  return config;
}

describe('Patches environment path resolution', () => {
  test('expands HOME variable in fileNamePath', async () => {
    const dest = join(process.env.HOME, 'patch_home.bin');
    fs.writeFileSync(dest, Buffer.from([0x00]));
    const config = makeConfig('${HOME}/patch_home.bin');
    await Patches.runPatches({ configuration: config });
    const data = fs.readFileSync(dest);
    expect(data[0]).toBe(0xff);
    fs.rmSync(dest, { force: true });
  });

  test('expands custom variable in fileNamePath', async () => {
    const destDir = join(process.cwd(), 'env_dest');
    const dest = join(destDir, 'patch_custom.bin');
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(dest, Buffer.from([0x00]));
    process.env.MY_PATCH_PATH = destDir;
    const config = makeConfig('${MY_PATCH_PATH}/patch_custom.bin');
    await Patches.runPatches({ configuration: config });
    const data = fs.readFileSync(dest);
    expect(data[0]).toBe(0xff);
    delete process.env.MY_PATCH_PATH;
    fs.rmSync(dest, { force: true });
    fs.rmSync(destDir, { recursive: true, force: true });
  });

  test('expands tilde in fileNamePath', async () => {
    const dest = join(os.homedir(), 'patch_tilde.bin');
    fs.writeFileSync(dest, Buffer.from([0x00]));
    const config = makeConfig('~/patch_tilde.bin');
    await Patches.runPatches({ configuration: config });
    const data = fs.readFileSync(dest);
    expect(data[0]).toBe(0xff);
    fs.rmSync(dest, { force: true });
  });

  test('expands percent-style variable in fileNamePath', async () => {
    const destDir = join(process.cwd(), 'env_dest_percent');
    const dest = join(destDir, 'patch_percent.bin');
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(dest, Buffer.from([0x00]));
    process.env.MY_PERCENT_PATH = destDir;
    const config = makeConfig('%MY_PERCENT_PATH%/patch_percent.bin');
    await Patches.runPatches({ configuration: config });
    const data = fs.readFileSync(dest);
    expect(data[0]).toBe(0xff);
    delete process.env.MY_PERCENT_PATH;
    fs.rmSync(dest, { force: true });
    fs.rmSync(destDir, { recursive: true, force: true });
  });
});
