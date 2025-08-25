import Logger from '../auxiliary/logger.js';
const { logInfo, logError } = Logger;


import { join } from 'path';

import File from '../auxiliary/file.js';
const { backupFile, getFileSizeUsingPath, readBinaryFile, writeBinaryFile } = File;

import Path from '../auxiliary/path.js';
const { resolveEnvPath } = Path;

import Parser from './parser.js';
const { parsePatchFile } = Parser;

import BufferUtils from './buffer.js';
const { patchLargeFile, patchMultipleOffsets } = BufferUtils;

import {
    ConfigurationObject,
    PatchFileObject,
    PatchOptionsObject
} from '../configuration/configuration.types.js';

import {
    PatchArray
} from './parser.types.js';

import Constants from '../configuration/constants.js';
const {
    PATCHES_BASEPATH,
    LARGE_FILE_THRESHOLD
} = Constants;

export namespace Patches {
    /**
     * All encompassing function that runs every patch with a configuration file
     *  
     * @example
     * ```
     * runPatches({ configuration });
     * ```
     * @return A resolved promise when patching is complete
     * @since 0.0.1
     */
    export async function runPatches({ configuration }:
        { configuration: ConfigurationObject }): Promise<void> {

        const { runPatches } = configuration.options.patches;
        if (runPatches === false) {
            logInfo(`Skipping running patches due to configuration`);
            return;
        }

        const { patches } = configuration;
        for (const patch of patches)
            if (patch.enabled)
                await runPatch({ configuration, patch });
    }

    /**
     * Run a single patch as defined per configuration and passed patch object
     * 
     * @param {Object} param0 Parameters object 
     * @param {ConfigurationObject} param0.configuration Configuration object read from `config.json` file
     * @param param0.patch Patch object passed from runPatches function using patches array
     * @example
     * ```
     * runPatch({ configuration, patch });
     * ```
     * @return Nada
     * @since 0.0.1
     */
    async function runPatch({ configuration, patch }:
        { configuration: ConfigurationObject, patch: PatchFileObject }): Promise<void> {

        try {
            const patchOptions: PatchOptionsObject = configuration.options.patches;

            await prepatchChecksAndRoutines({ patchOptions, patch });
            const patchFilePath: string = join(PATCHES_BASEPATH, patch.patchFilename);
            let patchData: PatchArray;
            try {
                patchData = await parsePatchFile({ filePath: patchFilePath, useStream: patchOptions.streamingParser });
            } catch (error) {
                logError(`Failed to parse patch file ${patchFilePath}: ${error}`);
                throw error;
            }
            const filePath: string = resolveEnvPath({ path: patch.fileNamePath });

            const fileSize: number = await getFileSizeUsingPath({ filePath });
            const hasBigOffset: boolean = patchData.some(p => (p.offset ?? 0n) > 0xffffffffn);
            const progressInterval: number | undefined = configuration.options.general.progressInterval;
            if (hasBigOffset || fileSize > LARGE_FILE_THRESHOLD) {
                if (patchOptions.skipWritingBinary === false)
                    await patchLargeFile({ filePath, patchData, options: patchOptions, progressInterval });
                else
                    logInfo(`Skipping writing binary file due to options`);
                return;
            }

            const fileDataBuffer: Buffer = await readBinaryFile({ filePath });

            const patchedFileData: Buffer = patchMultipleOffsets({ buffer: fileDataBuffer, patchData, options: patchOptions, progressInterval });
            const buffer: Buffer = patchedFileData;

            if (patchOptions.skipWritingBinary === false)
                await writeBinaryFile({ filePath, buffer });
            else
                logInfo(`Skipping writing binary file due to options`);
        } catch (error) {
            logError(`An error has ocurred running the patch ${error}`);
            throw error;
        }
    }

    /**
     * Run a checks and routines before patching a file like backup and file size check
     * 
     * @example
     * ```
     * prepatchChecksAndRoutines({ patchOptions, patch });
     * ```
     * @return Nada
     * @since 0.0.1
     */
    async function prepatchChecksAndRoutines({ patchOptions, patch }:
        { patchOptions: PatchOptionsObject, patch: PatchFileObject }): Promise<void> {

        const { backupFiles, fileSizeCheck, fileSizeThreshold } = patchOptions;
        const filePath: string = resolveEnvPath({ path: patch.fileNamePath });

        if (backupFiles === true) {
            logInfo(`Backing up files due to backup files option`);
            await backupFile({ filePath });
        }

        if (fileSizeCheck === true) {
            logInfo(`Checking file size due to file size check option`);
            const fileSize: number = await getFileSizeUsingPath({ filePath });
            if (fileSize <= fileSizeThreshold) {
                logError(`File size check failed, file size is at or below the defined threshold of ${fileSizeThreshold}`);
                throw new Error(`File size check failed`);
            }
        }

        return;
    }

}

export default Patches;
