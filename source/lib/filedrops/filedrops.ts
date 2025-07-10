import Packer from './packer.js';
const { unpackFile } = Packer;

import Crypt from './crypt.js';
const { decryptFile } = Crypt;

import File from '../auxiliary/file.js';
const { backupFile, readBinaryFile, writeBinaryFile } = File;

import Logger from '../auxiliary/logger.js';
const { logInfo, logError, logSuccess } = Logger;
import { join } from 'path';

import { ConfigurationObject, FiledropsObject, FiledropsOptionsObject } from '../configuration/configuration.types.js';

import Constants from '../configuration/constants.js';
const { PATCHES_BASEPATH } = Constants;

export namespace Filedrops {
    /**
     * Run all filedrops in configuration
     * 
     * @param params.configuration Configuration object
     * @example
     * ```
     * runFiledrops({ configuration });
     * ```
     * @returns Nada
     * @since 0.0.1
     */
    export async function runFiledrops({ configuration }:
        { configuration: ConfigurationObject }): Promise<void> {
        const { runFiledrops } = configuration.options.filedrops;
        if (runFiledrops === false) {
            logInfo(`Skipping filedrops due to configuration`);
            return;
        }
        const { filedrops } = configuration;
        for (const filedrop of filedrops)
            if (filedrop.enabled)
                await runFiledrop({ configuration, filedrop });
    }

    /**
     * Run a single file drop
     * 
     * @param params.configuration Configuration object
     * @param params.filedrop Single filedrop object
     * @example
     * ```
     * runFiledrop({ configuration, filedrop });
     * ```
     * @returns Nada
     * @since 0.0.1
     */
    export async function runFiledrop({ configuration, filedrop }:
        { configuration: ConfigurationObject, filedrop: FiledropsObject }): Promise<void> {
        try {
            const filedropOptions: FiledropsOptionsObject = configuration.options.filedrops;
            await prefiledropChecksAndRoutines({ filedropOptions, filedrop });
            let fileData: Buffer;
            const { isFiledropPacked, isFiledropCrypted } = configuration.options.filedrops;
            const filePath: string = join(PATCHES_BASEPATH, filedrop.fileDropName);
            if (isFiledropCrypted === true)
                fileData = await decryptFile({ filePath, key: filedrop.decryptKey });
            else
                fileData = await readBinaryFile({ filePath });
            if (isFiledropPacked === true)
                fileData = await unpackFile({ buffer: fileData, password: filedrop.decryptKey });
            await writeBinaryFile({ filePath: filedrop.fileNamePath, buffer: fileData });
            logSuccess(`File was dropped successfully`);
        } catch (error) {
            logError(`There was an error while dropping a file: ${error}`);
        }
    }

    /**
     * Run pre filedrop checks and routines
     * 
     * @param params.filedropOptions File drops options object
     * @param params.filedrop Filedrop object
     * @example
     * ```
     * prefiledropChecksAndRoutines({ filedropOptions, filedrop });
     * ```
     * @returns Nada
     * @since 0.0.1
     */
    async function prefiledropChecksAndRoutines({ filedropOptions, filedrop }:
        { filedropOptions: FiledropsOptionsObject, filedrop: FiledropsObject }): Promise<void> {
        const { backupFiles } = filedropOptions;
        const filePath: string = filedrop.fileNamePath;
        if (backupFiles === true) {
            logInfo(`Backing up files due to backup files option`);
            await backupFile({ filePath });
        }
    }
}

export default Filedrops;
