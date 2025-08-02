import fs from 'fs';
import { join } from 'path';
import os from 'os';
import { jest } from '@jest/globals';
import { ConfigurationDefaults } from '../source/lib/configuration/configuration.defaults.ts';


describe('Configuration.readConfigurationFile', () => {
  test('parses valid configuration JSON', async () => {
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'cfg-'));
    const filePath = join(dir, 'config.json');
    const configObj = ConfigurationDefaults.getDefaultConfigurationObject();
    configObj.options.general.debug = false;
    fs.writeFileSync(filePath, JSON.stringify(configObj), 'utf-8');

    const { Configuration } = await import('../source/lib/configuration/configuration.ts');
    const result = await Configuration.readConfigurationFile({ filePath });

    expect(result).toEqual(configObj);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('merges configuration with defaults for missing keys', async () => {
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'cfg-'));
    const filePath = join(dir, 'config.json');
    const partialConfig = { options: { general: { debug: false } } };
    fs.writeFileSync(filePath, JSON.stringify(partialConfig), 'utf-8');

    const { Configuration } = await import('../source/lib/configuration/configuration.ts');
    const result = await Configuration.readConfigurationFile({ filePath });

    const expected = ConfigurationDefaults.getDefaultConfigurationObject();
    expected.options.general.debug = false;
    expect(result).toEqual(expected);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('returns defaults when file not readable', async () => {
    jest.resetModules();
    jest.unstable_mockModule('../source/lib/auxiliary/file.wrappers.ts', () => ({
      default: { isFileReadable: jest.fn(async () => false) }
    }));
    const { Configuration } = await import('../source/lib/configuration/configuration.ts');
    const result = await Configuration.readConfigurationFile({ filePath: 'missing.json' });
    const defaults = ConfigurationDefaults.getDefaultConfigurationObject();
    expect(result).toEqual(defaults);
  });

  test('logs success message when file is read', async () => {
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'cfg-'));
    const filePath = join(dir, 'config.json');
    const configObj = ConfigurationDefaults.getDefaultConfigurationObject();
    configObj.options.general.debug = false;
    fs.writeFileSync(filePath, JSON.stringify(configObj), 'utf-8');

    const logFn = jest.fn();
    jest.resetModules();
    jest.unstable_mockModule('../source/lib/auxiliary/debug.js', () => ({ default: { log: logFn } }));
    jest.unstable_mockModule('../source/lib/auxiliary/file.wrappers.ts', () => ({ default: { isFileReadable: jest.fn(async () => true), getFileSize: jest.fn(async () => 42) } }));
    jest.unstable_mockModule('fs/promises', () => ({
      open: jest.fn(async () => ({
        readFile: jest.fn(async () => JSON.stringify(configObj)),
        close: jest.fn(async () => {})
      }))
    }));
    const { Configuration } = await import('../source/lib/configuration/configuration.ts');
    await Configuration.readConfigurationFile({ filePath });

    expect(logFn).toHaveBeenCalledWith({
      message: 'Configuration file read successfully',
      color: expect.any(Function)
    });
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('returns defaults and closes handle when read fails', async () => {
    const mockClose = jest.fn(async () => {});
    jest.resetModules();
    jest.unstable_mockModule('../source/lib/auxiliary/file.wrappers.ts', () => ({
      default: {
        isFileReadable: jest.fn(async () => true),
        getFileSize: jest.fn(async () => 5)
      }
    }));
    jest.unstable_mockModule('fs/promises', () => ({
      open: jest.fn(async () => ({
        readFile: jest.fn(async () => { throw new Error('fail'); }),
        close: mockClose,
        stat: jest.fn(async () => ({ size: 5 }))
      }))
    }));
    const { Configuration } = await import('../source/lib/configuration/configuration.ts');
    const result = await Configuration.readConfigurationFile({ filePath: 'any' });
    const defaults = ConfigurationDefaults.getDefaultConfigurationObject();
    expect(result).toEqual(defaults);
    expect(mockClose).toHaveBeenCalled();
  });
});

