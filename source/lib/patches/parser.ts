import { createReadStream } from 'fs';
import { createInterface } from 'readline';

import ParserWrappers from './parser.wrappers.js';
const { hexParse, hexParseBig, splitLines } = ParserWrappers;

import Logger from '../auxiliary/logger.js';
const { logInfo, logSuccess, logError } = Logger;

import { PatchParseError } from '../errors/index.js';

import {
    PatchArray,
    PatchObject
} from './parser.types.js';

export * from './parser.types.js';
export * from './parser.wrappers.js';

export namespace Parser {
    /**
     * Parse a patch file based on a buffer string to an patch object array or `PatchArray`
     * 
     * @param fileData String formatted buffer read from patch file
     * @example
     * ```
     * parsePatchFile({ fileData });
     * ```
     * @returns Patch object array or `PatchArray` type, empty array on failure
     * @since 0.0.1
     */
    export async function parsePatchFile({ fileData }:
        { fileData: string }): Promise<PatchArray> {
        try {
            const dataLength: number = fileData.length;
            if (dataLength === 0)
                throw new PatchParseError(`Patch file data is empty or corrupted`);
            logInfo(`Splitting file lines`);
            const patchData: string[] = splitLines({ fileData });
            logInfo(`Processing patch lines`);
            async function* lineIterator() {
                for (const line of patchData) {
                    yield line;
                }
            }
            const patches: PatchArray = await processLines(lineIterator());
            return patches;
        } catch (error: any) {
            logError(`An error has occurred: ${error}`);
            return new Array();
        }
    }

    /**
     * Parse a patch file using a readable stream to keep memory usage bounded
     *
     * @param filePath Path to the patch file
     * @example
     * ```
     * parsePatchFileStream({ filePath });
     * ```
     * @returns Patch object array or `PatchArray` type, empty array on failure
     * @since 0.0.1
     */
    export async function parsePatchFileStream({ filePath }:
        { filePath: string }): Promise<PatchArray> {
        try {
            logInfo(`Reading patch file as stream`);
            const stream = createReadStream(filePath, { encoding: 'utf-8' });
            const rl = createInterface({ input: stream, crlfDelay: Infinity });
            const patches: PatchArray = await processLines(rl);
            return patches;
        } catch (error: any) {
            logError(`An error has occurred: ${error}`);
            return [];
        }
    }

    /**
     * Create a patch array based on patch data read from a patch file
     * 
     * @param patchData Patch data extracted from a patch file, an array of patch lines
     * @example
     * ```
     * buildPatchesArray({ patchData });
     * ```
     * @returns A patch array with patch objects
     * @since 0.0.1
     */
    async function processLines(lines: AsyncIterable<string>): Promise<PatchArray> {
        try {
            const patches: PatchArray = [];
            let index = 0;
            for await (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.length === 0)
                    continue;
                if (trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith(';'))
                    continue;
                const patchObject: PatchObject = getPatchObject({ patchLine: trimmed, index });
                patches.push(patchObject);
                index++;
            }
            const patchesPushed: number = patches.length;
            if (patchesPushed === 0)
                throw new PatchParseError(`There were 0 patch objects pushed to the patches array`);
            logSuccess(`Patch objects array built with ${patchesPushed}`);
            return patches;
        } catch (error: any) {
            logError(`An error has occurred: ${error}`);
            const emptyPatchArray: PatchArray = [];
            return emptyPatchArray;
        }
    }

    /**
     * Get a patch object from a `patchLine` previously read from patch file
     * 
     * @param params.patchLine A raw/unprocessed patch line
     * @param params.index Patch index, used for logging/debugging purposes
     * @example
     * ```
     * getPatchObject({ patchLine, index });
     * ```
     * @returns A PatchObject containing offset, previous and new value, or a zeroed patch object on failure 
     * @since 0.0.1
     */
    function getPatchObject({ patchLine, index }:
        { patchLine: string, index: number }): PatchObject {
        try {
            const patchLineLength: number = patchLine.length;
            const defaultPatchLength: number = 15;
            if (patchLineLength < defaultPatchLength)
                throw new PatchParseError(`Patch at line ${index + 1} is invalid`);
            const offsetValuesDelimiter = /:\s+/;
            const previousNewValueDelimiter = ' ';

            const [offsetString, valuesString] = patchLine.split(offsetValuesDelimiter);
            const [previousValueString, newValueString] = valuesString.split(previousNewValueDelimiter);

            const valueLength = Math.max(previousValueString.length, newValueString.length);
            const byteLength = valueLength / 2;
            if (![1, 2, 4, 8].includes(byteLength))
                throw new PatchParseError(`Unsupported patch size ${byteLength}`);
            const typedByteLength = byteLength as 1 | 2 | 4 | 8;

            let offset: bigint;
            if (offsetString.length > 8)
                offset = hexParseBig({ hexString: offsetString });
            else
                offset = BigInt(hexParse({ hexString: offsetString }));

            let previousValue: number | bigint;
            let newValue: number | bigint;
            if (typedByteLength === 8) {
                previousValue = hexParseBig({ hexString: previousValueString });
                newValue = hexParseBig({ hexString: newValueString });
            } else {
                previousValue = hexParse({ hexString: previousValueString });
                newValue = hexParse({ hexString: newValueString });
            }

            const patchObject = {
                offset,
                previousValue,
                newValue,
                byteLength: typedByteLength
            };

            return patchObject;
        } catch (error: any) {
            logError(`An error has occurred: ${error}`);
            throw error;
        }
    }
}

export default Parser;
