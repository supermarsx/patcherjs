import Packer from './packer.js';
const { unpackFile } = Packer;

import Crypt from './crypt.js';
const { decryptFile } = Crypt;

import File from '../auxiliary/file.js';
const { backupFile, readBinaryFile, writeBinaryFile } = File;

import Debug from '../auxiliary/debug.js';
const { log } = Debug;

import colorsCli from 'colors-cli';
const { red_bt, white, green_bt } = colorsCli;

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
            log({ message: `Skipping filedrops due to configuration`, color: white });
            return;
        }
        const { filedrops } = configuration;
        for (const filedrop of filedrops)
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
            var fileData: Buffer;
            const { isFiledropPacked, isFiledropCrypted } = configuration.options.filedrops;
            const filePath: string = `${PATCHES_BASEPATH}${filedrop.fileDropName}`;
            if (isFiledropCrypted === true)
                fileData = await decryptFile({ filePath, key: filedrop.decryptKey });
            else
                fileData = await readBinaryFile({ filePath });
            if (isFiledropPacked === true)
                fileData = await unpackFile({ buffer: fileData, password: filedrop.decryptKey });
            await writeBinaryFile({ filePath: filedrop.fileNamePath, buffer: fileData });
            log({ message: `File was dropped successfully`, color: green_bt });
        } catch (error) {
            log({ message: `There was an error while dropping a file: ${error}`, color: red_bt });
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
            log({ message: `Backing up files due to backup files option`, color: white });
            await backupFile({ filePath });
        }
    }
}

export default Filedrops;
