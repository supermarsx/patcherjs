import Logger from '../auxiliary/logger.js';
const { logInfo, logWarn, logError } = Logger;


import { join } from 'path';

import File from '../auxiliary/file.js';
const { backupFile, getFileSizeUsingPath, readBinaryFile, readPatchFile, writeBinaryFile } = File;

import Parser from './parser.js';
const { parsePatchFile } = Parser;

import BufferUtils from './buffer.js';
const { patchBuffer, patchLargeFile } = BufferUtils;

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
            const patchFileData: string = await readPatchFile({ filePath: join(PATCHES_BASEPATH, patch.patchFilename) });
            const patchData: PatchArray = await parsePatchFile({ fileData: patchFileData });
            const filePath: string = patch.fileNamePath;

            const fileSize: number = await getFileSizeUsingPath({ filePath });
            const hasBigOffset: boolean = patchData.some(p => p.offset > 0xffffffffn);
            if (hasBigOffset || fileSize > LARGE_FILE_THRESHOLD) {
                if (patchOptions.skipWritingBinary === false)
                    await patchLargeFile({ filePath, patchData, options: patchOptions });
                else
                    logInfo(`Skipping writing binary file due to options`);
                return;
            }

            const fileDataBuffer: Buffer = await readBinaryFile({ filePath });

            const patchedFileData: Buffer = patchMultipleOffsets({ fileDataBuffer, patchData, patchOptions });
            const buffer: Buffer = patchedFileData;

            if (patchOptions.skipWritingBinary === false)
                await writeBinaryFile({ filePath, buffer });
            else
                logInfo(`Skipping writing binary file due to options`);
        } catch (error) {
            logError(`An error has ocurred running the patch ${error}`);
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
        const filePath: string = patch.fileNamePath;

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

    /**
     * Patch multiple offsets within a file/buffer in memory using a given patch data
     * 
     * @param fileDataBuffer File data buffer read into memory 
     * @example
     * ```
     * patchMultipleOffsets({ fileDataBuffer, patchData, patchOptions });
     * ```
     * @returns A fully patched buffer (`fileDataBuffer`) based on the provided `patchdata`.
     * @since 0.0.1
     */
    function patchMultipleOffsets({ fileDataBuffer, patchData, patchOptions }:
        { fileDataBuffer: Buffer, patchData: PatchArray, patchOptions: PatchOptionsObject }): Buffer {

        let buffer: Buffer = fileDataBuffer;
        const fileSize: number = buffer.length;
        for (const patch of patchData) {
            const { offset, previousValue, newValue, byteLength } = patch;
            const offsetNumber: number = Number(offset);
            const { forcePatch, unpatchMode, nullPatch, failOnUnexpectedPreviousValue, warnOnUnexpectedPreviousValue, skipWritePatch, allowOffsetOverflow, verifyPatch, bigEndian } = patchOptions;
            if (offsetNumber >= fileSize && allowOffsetOverflow !== true) {
                logWarn(`Offset ${offset} exceeds file size ${fileSize}, skipping patch`);
                continue;
            }
            buffer = patchBuffer({
                buffer, offset: offsetNumber, previousValue, newValue, byteLength,
                options: {
                    forcePatch,
                    unpatchMode,
                    nullPatch,
                    failOnUnexpectedPreviousValue,
                    warnOnUnexpectedPreviousValue,
                    skipWritePatch,
                    allowOffsetOverflow,
                    verifyPatch,
                    bigEndian
                }
            });
        }
        return buffer;
    }
}

export default Patches;
