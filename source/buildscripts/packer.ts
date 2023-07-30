import Patcher from '../lib/composites.js';
const { packAndEncryptFile } = Patcher;

import Configuration from '../lib/configuration/configuration.js';
const { readConfiguration } = Configuration;

import { ConfigurationObject } from '../lib/configuration/configuration.types.js';

import Constants from '../lib/configuration/constants.js';
const { CONFIG_FILEPATH } = Constants;

packFiles();
async function packFiles() {
    const configFilePath = CONFIG_FILEPATH;
    const configuration: ConfigurationObject = await readConfiguration({ filePath: configFilePath });
    await packAndEncryptFile({ configuration });
}



