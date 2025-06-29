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
});

