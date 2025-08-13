import * as fs from 'fs/promises';

import FileWrappers from '../auxiliary/file.wrappers.js';
const { getFileSize, isFileReadable } = FileWrappers;

import Defaults from './configuration.defaults.js';
const { getDefaultConfigurationObject } = Defaults;

import Logger from '../auxiliary/logger.js';
const { logInfo, logSuccess, logWarn, logError } = Logger;

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
    type DeepPartial<T> = T extends Array<infer U>
        ? Array<DeepPartial<U>>
        : T extends object
            ? { [K in keyof T]?: DeepPartial<T[K]> }
            : T | undefined;

    function isObject(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    export function mergeWithDefaults<T>(defaultObj: T, providedObj?: DeepPartial<T>): T {
        const defaultIsArray: boolean = Array.isArray(defaultObj);
        const providedIsArray: boolean = Array.isArray(providedObj);

        if (defaultIsArray || providedIsArray) {
            const defaultArray: unknown[] = defaultIsArray ? (defaultObj as unknown[]) : [];
            const providedArray: unknown[] = providedIsArray ? (providedObj as unknown[]) : [];
            const length = Math.max(defaultArray.length, providedArray.length);
            const result: unknown[] = [];
            for (let i = 0; i < length; i++) {
                result[i] = mergeWithDefaults(
                    defaultArray[i] as any,
                    providedArray[i] as any
                );
            }
            return result as T;
        }

        const defaultIsObj: boolean = isObject(defaultObj);
        const providedIsObj: boolean = isObject(providedObj);

        if (!defaultIsObj && !providedIsObj)
            return (providedObj !== undefined ? providedObj : defaultObj) as T;

        const result: Record<string, unknown> = {};
        const keys = new Set<string>([
            ...Object.keys(defaultIsObj ? (defaultObj as Record<string, unknown>) : {}),
            ...Object.keys(providedIsObj ? (providedObj as Record<string, unknown>) : {})
        ]);
        keys.forEach(key => {
            const dVal = defaultIsObj ? (defaultObj as any)[key] : undefined;
            const pVal = providedIsObj ? (providedObj as any)[key] : undefined;
            result[key] = mergeWithDefaults(dVal, pVal);
        });
        return result as T;
    }

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
        let fileHandle: fs.FileHandle | undefined;
        try {
            const encoding: BufferEncoding = CONFIG_ENCODING;
            const cantReadFile: boolean = !(await isFileReadable({ filePath }));
            if (cantReadFile)
                throw new Error(`Configuration file is not readable, is missing or corrupted`);
            fileHandle = await fs.open(filePath);
            const bufferSize: number = await getFileSize({ fileHandle });
            if (bufferSize === 0)
                logWarn('Configuration file size is 0, file may be corrupted or invalid');
            else
                logSuccess(`Configuration file size, ${bufferSize}`);
            logInfo(`Reading configuration file handle with ${encoding} encoding`);
            const fileData: string = await fileHandle.readFile({
                encoding: encoding
            });
            const dataLength: number = fileData.length;
            if (dataLength === 0)
                logWarn(`Configuration file data size is 0, file may be corrupted or invalid`);
            else
                logSuccess(`Configuration file read successfully`);
            const configObject: ConfigurationObject = JSON.parse(fileData);
            const defaultConfig: ConfigurationObject = getDefaultConfigurationObject();
            const mergedConfig: ConfigurationObject = mergeWithDefaults(defaultConfig, configObject);
            return mergedConfig;
        } catch (error: any) {
            logError(`An error has occurred: ${error}`);
            const emptyConfig: ConfigurationObject = getDefaultConfigurationObject();
            return emptyConfig;
        } finally {
            if (fileHandle) {
                await fileHandle.close();
                logInfo(`Closed file handle`);
            }
        }
    }
}

 export default Configuration;
