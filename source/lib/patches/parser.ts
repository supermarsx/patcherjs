import ParserWrappers from './parser.wrappers.js';
const { hexParse, hexParseBig, splitLines } = ParserWrappers;

import Debug from '../auxiliary/debug.js';
const { log } = Debug;

import colorsCli from 'colors-cli';
const { green_bt, red_bt, white } = colorsCli;

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
                throw new Error(`Patch file data is empty or corrupted`);
            log({ message: `Splitting file lines`, color: white });
            const patchData: Array<any> = splitLines({ fileData });
            log({ message: `Building patch objects array`, color: white });
            const patches: Array<any> = buildPatchesArray({ patchData });
            const patchesCount: number = patches.length;
            log({ message: `Patch objects array built with ${patchesCount}`, color: green_bt });
            return patches;
        } catch (error: any) {
            log({ message: `An error has occurred: ${error}`, color: red_bt });
            return new Array();
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
    function buildPatchesArray({ patchData }:
        { patchData: Array<any> }): PatchArray {
        try {
            const lines: number = patchData.length;
            log({ message: `Found ${lines} patch(es) inside patch data`, color: white });
            var patches: PatchArray = [];
            log({ message: `Pushing patch objects into an array`, color: white });
            for (const [index, patchLine] of patchData.entries()) {
                const patchObject: PatchObject = getPatchObject({ patchLine, index })
                patches.push(patchObject);
            }
            const patchesPushed: number = patches.length;
            if (patchesPushed === 0)
                throw new Error(`There were 0 patch objects pushed to the patches array`);
            log({ message: `There were ${patchesPushed} patch objects pushed`, color: green_bt });
            return patches;
        } catch (error: any) {
            log({ message: `An error has occurred: ${error}`, color: red_bt });
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
                throw new Error(`Patch at line ${index + 1} is invalid`);
            const offsetValuesDelimiter: string = `: `;
            const previousNewValueDelimiter: string = ' ';

            const [offsetString, valuesString] = patchLine.split(offsetValuesDelimiter);
            const [previousValueString, newValueString] = valuesString.split(previousNewValueDelimiter);

            const valueLength = Math.max(previousValueString.length, newValueString.length);
            const byteLength = (valueLength / 2) as 1 | 2 | 4 | 8;

            let offset: bigint;
            if (offsetString.length > 8)
                offset = hexParseBig({ hexString: offsetString });
            else
                offset = BigInt(hexParse({ hexString: offsetString }));

            let previousValue: number | bigint;
            let newValue: number | bigint;
            if (byteLength === 8) {
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
                byteLength
            };

            return patchObject;
        } catch (error: any) {
            log({ message: `An error has occurred: ${error}`, color: red_bt });
            const returnValue: PatchObject = {
                offset: BigInt(0),
                previousValue: 0,
                newValue: 0,
                byteLength: 1
            };
            return returnValue;
        }
    }
}

export default Parser;
