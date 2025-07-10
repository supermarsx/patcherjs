import File from '../auxiliary/file.js';
const { readBinaryFile, writeBinaryFile } = File;

import Packer from '../filedrops/packer.js';
const { packFile } = Packer;

import Encryption from '../filedrops/crypt.js';
const { encryptFile } = Encryption;

import Logger from '../auxiliary/logger.js';
const { logInfo, logSuccess, logError } = Logger;
import { join } from 'path';

import {
    ConfigurationObject,
    FiledropsObject,
    FiledropsOptionsObject
} from '../configuration/configuration.types.js';

import Constants from '../configuration/constants.js';
const {
    PATCHES_BASEPATH,
    PATCHES_BASEUNPACKEDPATH
} = Constants;

export namespace Packaging {
    /**
     * @internal
     * Run a collection of filedrops from a configuration file 
     * 
     * @param params.configuration Read configuration file from `config.json`
     * @example
     * ```
     * runPackings({ configuration });
     * ```
     * @returns Nada
     * @since 0.0.1
     */
    export async function runPackings({ configuration }:
        { configuration: ConfigurationObject }): Promise<void> {
        logInfo(`Running packing mode`);
        const { runFiledrops } = configuration.options.filedrops;
        if (runFiledrops === false) {
            logInfo(`Skipping packing due to runFiledrops configuration`);
            return;
        }

        const { filedrops } = configuration;
        for (const filedrop of filedrops) {
            if (!filedrop.enabled)
                continue;
            await runPacking({ configuration, filedrop });
        }
    }

    /**
     * Run a single packing routine where a filedrop is packed (compressed) and encrypted using AES-256
     * 
     * @param params.configuration Configuration read from `config.json`
     * @param params.filedrop A specific filedrop object from the filedrops array read from configuration
     * @example
     * ```
     * runPacking({ configuration, filedrop });
     * ``` 
     * @returns nada
     * @since 0.0.1
     */
    async function runPacking({ configuration, filedrop }:
        { configuration: ConfigurationObject, filedrop: FiledropsObject }): Promise<void> {
        try {
            logInfo(`Packing file ${filedrop.fileNamePath}`);
            const filedropOptions: FiledropsOptionsObject = configuration.options.filedrops;

            let fileData: Buffer;
            const { isFiledropPacked, isFiledropCrypted } = filedropOptions;
            const filePath: string = join(PATCHES_BASEUNPACKEDPATH, filedrop.packedFileName);
            fileData = await readBinaryFile({ filePath });
            if (isFiledropPacked === true)
                fileData = await packFile({ buffer: fileData, password: filedrop.decryptKey })
            if (isFiledropCrypted === true)
                fileData = await encryptFile({ buffer: fileData, key: filedrop.decryptKey });

            await writeBinaryFile({
                filePath: join(PATCHES_BASEPATH, filedrop.fileDropName), buffer: fileData
            });
            logSuccess(`File was packed successfully`);
        } catch (error) {
            logError(`There was an error packing a file: ${error}`);
        }
    }
}

export default Packaging;

