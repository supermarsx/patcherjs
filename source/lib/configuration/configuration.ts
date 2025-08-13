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

import Ajv from 'ajv';
import configurationSchema from './configuration.schema.js';

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

    const ajv = new Ajv({ allErrors: true });
    const validateFn = ajv.compile(configurationSchema);

    export function validateConfiguration(config: unknown): ConfigurationObject {
        if (validateFn(config))
            return config as ConfigurationObject;
        const err = new Error(`Configuration validation failed: ${ajv.errorsText(validateFn.errors)}`);
        err.name = 'ValidationError';
        throw err;
    }

    export function mergeWithDefaults<T>(defaultObj: T, providedObj?: DeepPartial<T>): T {
        if (Array.isArray(defaultObj) || Array.isArray(providedObj)) {
            type Element = T extends Array<infer U> ? U : never;
            const defaultArray = Array.isArray(defaultObj) ? defaultObj as Element[] : [];
            const providedArray = Array.isArray(providedObj) ? providedObj as DeepPartial<Element>[] : [];
            const result = defaultArray.map(item =>
                mergeWithDefaults<Element>(item)
            );
            providedArray.forEach((item, index) => {
                if (index < result.length && (isObject(item) || Array.isArray(item)))
                    result[index] = mergeWithDefaults<Element>(result[index], item);
                else if (index < result.length && result[index] === item)
                    return;
                else
                    result.push(mergeWithDefaults<Element>(item as Element));
            });
            return result as unknown as T;
        }

        if (isObject(defaultObj) || isObject(providedObj)) {
            const defaultRecord = (isObject(defaultObj) ? defaultObj : {}) as { [K in keyof T]: T[K] };
            const providedRecord = (isObject(providedObj) ? providedObj : {}) as { [K in keyof T]?: DeepPartial<T[K]> };
            const result = {} as { [K in keyof T]: T[K] };
            const keys = new Set<keyof T>([
                ...(Object.keys(defaultRecord) as Array<keyof T>),
                ...(Object.keys(providedRecord) as Array<keyof T>)
            ]);
            keys.forEach(key => {
                result[key] = mergeWithDefaults(defaultRecord[key], providedRecord[key]);
            });
            return result as T;
        }

        return (providedObj !== undefined ? providedObj : defaultObj) as T;
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
            const configObject: unknown = JSON.parse(fileData);
            const validatedConfig: ConfigurationObject = validateConfiguration(configObject);
            const defaultConfig: ConfigurationObject = getDefaultConfigurationObject();
            const mergedConfig = mergeWithDefaults<ConfigurationObject>(defaultConfig, configObject as DeepPartial<ConfigurationObject>);
            return mergedConfig;
        } catch (error: any) {
            logError(`An error has occurred: ${error}`);
            if (error instanceof Error && error.name === 'ValidationError')
                throw error;
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
