import { createReadStream } from 'fs';
import { stat, readFile } from 'fs/promises';
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
     * Parse a patch file from either raw data or a file path. When a file path
     * is provided, parsing will stream the file if `useStream` is true or if the
     * file size exceeds `streamThreshold`.
     *
     * @param params.fileData Pre-loaded patch file contents
     * @param params.filePath Path to the patch file
     * @param params.useStream Force streaming mode
     * @param params.streamThreshold Size in bytes above which streaming is automatically used
     * @example
     * ```
     * parsePatchFile({ fileData });
     * parsePatchFile({ filePath, useStream: true });
     * ```
     * @returns Patch object array or `PatchArray` type, empty array on failure
     * @since 0.0.1
     */
    export async function parsePatchFile({ fileData, filePath, useStream = false, streamThreshold = 1024 * 1024 }:
        { fileData?: string, filePath?: string, useStream?: boolean, streamThreshold?: number }): Promise<PatchArray> {
        try {
            let lines: AsyncIterable<string>;

            if (fileData !== undefined) {
                if (fileData.length === 0)
                    throw new PatchParseError(`Patch file data is empty or corrupted`);
                logInfo(`Splitting file lines`);
                const patchData: string[] = splitLines({ fileData });
                logInfo(`Processing patch lines`);
                async function* lineIterator() {
                    for (const line of patchData)
                        yield line;
                }
                lines = lineIterator();
            } else if (filePath !== undefined) {
                let stream = useStream;
                if (!stream) {
                    const stats = await stat(filePath);
                    stream = stats.size > streamThreshold;
                }

                if (stream) {
                    logInfo(`Reading patch file as stream`);
                    const fileStream = createReadStream(filePath, { encoding: 'utf-8' });
                    lines = createInterface({ input: fileStream, crlfDelay: Infinity });
                } else {
                    logInfo(`Reading patch file`);
                    const data = await readFile(filePath, { encoding: 'utf-8' });
                    const patchData: string[] = splitLines({ fileData: data });
                    async function* lineIterator() {
                        for (const line of patchData)
                            yield line;
                    }
                    lines = lineIterator();
                }
            } else
                throw new PatchParseError(`No patch file data or path provided`);

            const patches: PatchArray = await processLines(lines);
            return patches;
        } catch (error: any) {
            logError(`An error has occurred: ${error}`);
            if (error instanceof PatchParseError)
                throw error;
            throw new PatchParseError(error?.message ?? String(error));
        }
    }

    /**
     * Process each patch line into a `PatchArray`.
     *
     * @param lines Patch lines to process
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
            if (error instanceof PatchParseError)
                throw error;
            throw new PatchParseError(error?.message ?? String(error));
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
