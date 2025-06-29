import Debug from '../auxiliary/debug.js';
const { log } = Debug;

import colorsCli from 'colors-cli';
const { red_bt } = colorsCli;

export namespace ParserWrappers {
    /**
     *  Parse an integer from an hexadecimal formatted string
     * 
     * @param params.hexString hexadecimal formatted string
     * @example
     * ```
     * hexParse({ hexString: 'fef123' });
     * ```
     * result: 16707875
     * @returns Decimal representation of an hexadecimal formatted string or 0 on failure
     * @since 0.0.1
     */
    export function hexParse({ hexString }:
        { hexString: string }): number {
        try {
            const radix: number = 16;
            const decimalString: number = parseInt(hexString, radix);
            return decimalString;
        } catch (error: any) {
            log({ message: `An error has occurred: ${error}`, color: red_bt });
            return 0;
        }
    }

    /**
     * Parse a bigint from an hexadecimal formatted string
     *
     * @param params.hexString hexadecimal formatted string
     * @example
     * ```
     * hexParseBig({ hexString: 'ffffffff9' });
     * ```
     * result: 68719476729n
     * @returns BigInt representation of an hexadecimal formatted string or 0n on failure
     * @since 0.0.2
     */
    export function hexParseBig({ hexString }:
        { hexString: string }): bigint {
        try {
            const value: bigint = BigInt('0x' + hexString);
            return value;
        } catch (error: any) {
            log({ message: `An error has occurred: ${error}`, color: red_bt });
            return BigInt(0);
        }
    }

    /**
     * Split a contiguous string containing line breaks into an array where each element is a line
     * 
     * @param params.fileData string containing line breaks
     * @example
     * ```
     * splitLines({ fileData });
     * ```
     * @returns An array where each element is aline or an empty array on failure
     * @since 0.0.1
     */
    export function splitLines({ fileData }:
        { fileData: string }): Array<string> {
        try {
            const patchData: Array<string> = fileData.split(/\r?\n/);
            return patchData;
        } catch (error: any) {
            log({ message: `An error has occurred ${error}`, color: red_bt });
            return new Array();
        }
    }
}

export default ParserWrappers;
