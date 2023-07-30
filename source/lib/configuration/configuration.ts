import * as fs from 'fs/promises';

import FileWrappers from '../auxiliary/file.wrappers.js';
const { getFileSize, isFileReadable } = FileWrappers;

import Defaults from './configuration.defaults.js';
const { getDefaultConfigurationObject } = Defaults;

import Debug from '../auxiliary/debug.js';
const { log } = Debug;

import colorsCli from 'colors-cli';
const { green_bt, red_bt, white, yellow_bt } = colorsCli;

import {
    ConfigurationObject
} from '../configuration/configuration.types.js';

import Constants from '../configuration/constants.js';
const {
    CONFIG_ENCODING,
    CONFIG_FILEPATH
} = Constants;

export * from './configuration.defaults.js';
export * from './configuration.types.js';

export namespace Configuration {

    /**
     * Read configuration file from a path
     * 
     * @param params.filePath Configuration file path
     * @example
     * ```
     * readConfigurationFile({ filePath });
     * ```
     * @returns Configuration object
     * @since 0.0.1
     */
    export async function readConfigurationFile({ filePath = CONFIG_FILEPATH }:
        { filePath?: string }): Promise<ConfigurationObject> {
        try {
            const encoding: BufferEncoding = CONFIG_ENCODING;
            const cantReadFile: boolean = await !(isFileReadable({ filePath }));
            if (cantReadFile)
                throw new Error(`Configuration file is not readable, is missing or corrupted`);
            const fileHandle: fs.FileHandle = await fs.open(filePath);
            const bufferSize: number = await getFileSize({ fileHandle });
            if (bufferSize === 0)
                log({ message: 'Configuration file size is 0, file may be corrupted or invalid', color: yellow_bt });
            else
                log({ message: `Configuration file size, ${bufferSize}`, color: green_bt });
            log({ message: `Reading configuration file handle with ${encoding} encoding`, color: white });
            const fileData: string = await fileHandle.readFile({
                encoding: encoding
            });
            const dataLength: number = fileData.length;
            if (dataLength === 0)
                log({ message: `Configuration file data size is 0, file may be corrupted or invalid`, color: yellow_bt });
            else
                log({ message: `Configuration patch file successfully to buffer`, color: green_bt });
            await fileHandle.close();
            log({ message: `Closed file handle`, color: white });
            const configObject: ConfigurationObject = JSON.parse(fileData);
            return configObject;
        } catch (error: any) {
            log({ message: `An error has occurred: ${error}`, color: red_bt });
            const emptyConfig: ConfigurationObject = getDefaultConfigurationObject();
            return emptyConfig;
        }
    }
    export const readConfiguration = readConfigurationFile;
    export const readConfig = readConfigurationFile;
    export const readConf = readConfigurationFile;
}

 export default Configuration;
