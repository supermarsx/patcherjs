import fs from 'fs';
import { join } from 'path';
import os from 'os';
import { jest } from '@jest/globals';
import yaml from 'js-yaml';
import { ConfigurationDefaults } from '../source/lib/configuration/configuration.defaults.ts';


describe('Configuration.readConfigurationFile', () => {
  beforeEach(() => {
    jest.unmock('../source/lib/configuration/configuration.defaults.ts');
    jest.resetModules();
  });
  test('parses valid configuration JSON', async () => {
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'cfg-'));
    const filePath = join(dir, 'config.json');
    const configObj = ConfigurationDefaults.getDefaultConfigurationObject();
    configObj.options.general.debug = false;
    configObj.options.general.progressInterval = 1;
    fs.writeFileSync(filePath, JSON.stringify(configObj), 'utf-8');

    const { Configuration } = await import('../source/lib/configuration/configuration.ts');
    const result = await Configuration.readConfigurationFile({ filePath });

    expect(result).toEqual(configObj);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('parses valid configuration YAML', async () => {
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'cfg-'));
    const filePath = join(dir, 'config.yaml');
    const configObj = ConfigurationDefaults.getDefaultConfigurationObject();
    configObj.options.general.debug = false;
    configObj.options.general.progressInterval = 1;
    fs.writeFileSync(filePath, yaml.dump(configObj), 'utf-8');

    const { Configuration } = await import('../source/lib/configuration/configuration.ts');
    const result = await Configuration.readConfigurationFile({ filePath });

    expect(result).toEqual(configObj);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('JSON and YAML configuration files produce identical objects', async () => {
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'cfg-'));
    const jsonPath = join(dir, 'config.json');
    const yamlPath = join(dir, 'config.yaml');
    const configObj = ConfigurationDefaults.getDefaultConfigurationObject();
    configObj.options.general.progressInterval = 1;
    fs.writeFileSync(jsonPath, JSON.stringify(configObj), 'utf-8');
    fs.writeFileSync(yamlPath, yaml.dump(configObj), 'utf-8');

    const { Configuration } = await import('../source/lib/configuration/configuration.ts');
    const jsonResult = await Configuration.readConfigurationFile({ filePath: jsonPath });
    const yamlResult = await Configuration.readConfigurationFile({ filePath: yamlPath });

    expect(yamlResult).toEqual(jsonResult);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('throws error on invalid configuration JSON', async () => {
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'cfg-'));
    const filePath = join(dir, 'config.json');
    const invalid = { options: { general: { debug: 'false' } } };
    fs.writeFileSync(filePath, JSON.stringify(invalid), 'utf-8');

    const { Configuration } = await import('../source/lib/configuration/configuration.ts');

    await expect(Configuration.readConfigurationFile({ filePath })).rejects.toThrow('Configuration validation failed');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('validation after merge rejects invalid values', async () => {
    const invalid = { options: { general: { debug: 'false' } } };
    const defaults = ConfigurationDefaults.getDefaultConfigurationObject();
    const { Configuration } = await import('../source/lib/configuration/configuration.ts');
    const merged = Configuration.mergeWithDefaults(defaults, invalid);
    expect(() => Configuration.validateConfiguration(merged)).toThrow('Configuration validation failed');
  });

  test('rejects non-number progressInterval in configuration JSON', async () => {
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'cfg-'));
    const filePath = join(dir, 'config.json');
    const invalid = { options: { general: { progressInterval: 'invalid' } } };
    fs.writeFileSync(filePath, JSON.stringify(invalid), 'utf-8');

    const { Configuration } = await import('../source/lib/configuration/configuration.ts');

    await expect(Configuration.readConfigurationFile({ filePath })).rejects.toThrow('Configuration validation failed');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('validation after merge rejects non-number progressInterval', async () => {
    const invalid = { options: { general: { progressInterval: 'invalid' } } };
    const defaults = ConfigurationDefaults.getDefaultConfigurationObject();
    const { Configuration } = await import('../source/lib/configuration/configuration.ts');
    const merged = Configuration.mergeWithDefaults(defaults, invalid);
    expect(() => Configuration.validateConfiguration(merged)).toThrow('Configuration validation failed');
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

  test('includes nested keys absent from defaults', async () => {
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'cfg-'));
    const filePath = join(dir, 'config.json');
    const partialConfig = { options: { experimental: { feature: true } } };
    fs.writeFileSync(filePath, JSON.stringify(partialConfig), 'utf-8');

    const { Configuration } = await import('../source/lib/configuration/configuration.ts');
    const result = await Configuration.readConfigurationFile({ filePath });

    expect(result.options.experimental.feature).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('deep clones nested arrays and objects', async () => {
    const defaultObj = { options: { general: { arr: [1, 2], obj: { a: 1 } } } };
    const { Configuration } = await import('../source/lib/configuration/configuration.ts');
    const result = Configuration.mergeWithDefaults(defaultObj, {});

    expect(result.options.general.arr).toEqual([1, 2]);
    expect(result.options.general.arr).not.toBe(defaultObj.options.general.arr);
    result.options.general.arr.push(3);
    expect(defaultObj.options.general.arr).toEqual([1, 2]);

    expect(result.options.general.obj).toEqual({ a: 1 });
    expect(result.options.general.obj).not.toBe(defaultObj.options.general.obj);
    result.options.general.obj.a = 2;
    expect(defaultObj.options.general.obj).toEqual({ a: 1 });
  });

  test('merges arrays of objects by index', async () => {
    const defaults = { patches: [{ name: 'a', enabled: true }] };
    const provided = { patches: [{ name: 'b' }] };
    const { Configuration } = await import('../source/lib/configuration/configuration.ts');
    const result = Configuration.mergeWithDefaults(defaults, provided);
    expect(result).toEqual({ patches: [{ name: 'b', enabled: true }] });
  });

  test('merges primitive arrays by index', async () => {
    const defaults = { nums: [1, 2] };
    const provided = { nums: [3] };
    const { Configuration } = await import('../source/lib/configuration/configuration.ts');
    const result = Configuration.mergeWithDefaults(defaults, provided);
    expect(result.nums).toEqual([3, 2]);
  });

  test('merges nested structures', async () => {
    const defaults = { a: { b: { c: 1 } } };
    const provided = { a: { b: { d: 2 } } };
    const { Configuration } = await import('../source/lib/configuration/configuration.ts');
    const result = Configuration.mergeWithDefaults(defaults, provided);
    expect(result).toEqual({ a: { b: { c: 1, d: 2 } } });
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

    expect(logFn).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Configuration file read successfully'),
      color: expect.any(Function)
    }));
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

describe('Configuration.validateConfiguration', () => {
  test('accepts valid configuration', async () => {
    const configObj = ConfigurationDefaults.getDefaultConfigurationObject();
    const { Configuration } = await import('../source/lib/configuration/configuration.ts');
    expect(Configuration.validateConfiguration(configObj)).toEqual(configObj);
  });

  test('throws on invalid configuration', async () => {
    const { Configuration } = await import('../source/lib/configuration/configuration.ts');
    expect(() => Configuration.validateConfiguration({ options: { general: { debug: 'yes' } } })).toThrow('Configuration validation failed');
  });
});

