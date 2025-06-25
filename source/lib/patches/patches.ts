import Debug from '../auxiliary/debug.js';
const { log } = Debug;

import colorsCli from 'colors-cli';
const { red_bt, white } = colorsCli;

import File from '../auxiliary/file.js';
const { backupFile, getFileSizeUsingPath, readBinaryFile, readPatchFile, writeBinaryFile } = File;

import Parser from './parser.js';
const { parsePatchFile } = Parser;

import Buffer from './buffer.js';
const { patchBuffer } = Buffer;

import {
    ConfigurationObject,
    PatchFileObject,
    PatchOptionsObject
} from '../configuration/configuration.types.js';

import {
    PatchArray
} from './parser.types.js';

import Constants from '../configuration/constants.js';
import { join } from 'path';
const {
    PATCHES_BASEPATH
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
            log({ message: `Skipping running patches due to configuration`, color: white });
            return;
        }

        const { patches } = configuration;
        for (const patch of patches)
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

            const fileDataBuffer: Buffer = await readBinaryFile({ filePath });

            const patchedFileData: Buffer = await patchMultipleOffsets({ fileDataBuffer, patchData, patchOptions });
            const buffer: Buffer = patchedFileData;

            if (patchOptions.skipWritingBinary === false)
                await writeBinaryFile({ filePath, buffer });
            else
                log({ message: `Skipping writing binary file due to options`, color: white });
        } catch (error) {
            log({ message: `An error has ocurred running the patch ${error}`, color: red_bt });
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
            log({ message: `Backing up files due to backup files option`, color: white });
            await backupFile({ filePath });
        }

        if (fileSizeCheck === true) {
            log({ message: `Checking file size due to file size check option`, color: white });
            const fileSize: number = await getFileSizeUsingPath({ filePath });
            if (fileSize <= fileSizeThreshold) {
                log({ message: `File size check failed, file size is at or below the defined threshold of ${fileSizeThreshold}`, color: red_bt });
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

        var buffer: Buffer = fileDataBuffer;
        for (const patch of patchData) {
            const { offset, previousValue, newValue } = patch;
            const { forcePatch, unpatchMode, nullPatch, failOnUnexpectedPreviousValue, warnOnUnexpectedPreviousValue, skipWritePatch } = patchOptions;
            buffer = patchBuffer({
                buffer, offset, previousValue, newValue,
                options: {
                    forcePatch,
                    unpatchMode,
                    nullPatch,
                    failOnUnexpectedPreviousValue,
                    warnOnUnexpectedPreviousValue,
                    skipWritePatch
                }
            });
        }
        return buffer;
    }
}

export default Patches;
