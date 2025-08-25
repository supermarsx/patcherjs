import * as fs from 'fs/promises';

import Logger from '../auxiliary/logger.js';
const { logInfo, logWarn, logError } = Logger;

import { OptionsType } from '../patches/buffer.types.js';
import { PatchArray } from './parser.types.js';

export * from './buffer.types.js';
export * from './buffer.wrappers.js';

export namespace BufferUtils {
    /**
     * Patch a buffer
     * 
     * @param params.buffer Buffer to patch
     * @param params.offset Decimal offset
     * @param params.previousValue Decimal previous value to find
     * @param params.newValue Decimal new value to write
     * @param params.options Patch options object
     * @example
     * ```
     * patchBuffer({ buffer, offset, previousValue, newValue,
     *    options = {
     *        forcePatch: false,
     *        unpatchMode: false,
     *        nullPatch: false,
     *        failOnUnexpectedPreviousValue: false,
     *        warnOnUnexpectedPreviousValue: true,
     *        skipWritePatch: false
     *    } 
     * });
     * ```
     * @returns Patched buffer
     * @since 0.0.1
     */
    export function patchBuffer({
        buffer,
        offset,
        previousValue,
        newValue,
        byteLength = 1,
        options = {
            forcePatch: false,
            unpatchMode: false,
            nullPatch: false,
            failOnUnexpectedPreviousValue: false,
            warnOnUnexpectedPreviousValue: true,
            skipWritePatch: false,
            allowOffsetOverflow: false,
            bigEndian: false,
            verifyPatch: false
        } }:
        {
            buffer: Buffer,
            offset: number,
            previousValue: number | bigint,
            newValue: number | bigint,
            byteLength?: 1 | 2 | 4 | 8,
            options: OptionsType
        }): Buffer {


        const {
            forcePatch,
            unpatchMode,
            nullPatch,
            failOnUnexpectedPreviousValue,
            warnOnUnexpectedPreviousValue,
            skipWritePatch,
            verifyPatch = false,
            allowOffsetOverflow,
            bigEndian = false
        } = options;
        try {
            let workingBuffer: Buffer = buffer;
            if (offset < 0) {
                logWarn(`Offset ${offset} is negative, skipping patch`);
                return workingBuffer;
            }
            if (offset + byteLength > workingBuffer.length) {
                if (allowOffsetOverflow !== true) {
                    logWarn(`Offset ${offset} with length ${byteLength} exceeds buffer size ${workingBuffer.length}, skipping patch`);
                    return workingBuffer;
                }
                const expanded = Buffer.alloc(offset + byteLength);
                workingBuffer.copy(expanded, 0, 0, workingBuffer.length);
                workingBuffer = expanded;
            }
            const currentValue = readValue({ buffer: workingBuffer, offset, byteLength, bigEndian });

            validatePatchValues({
                offset,
                currentValue,
                previousValue,
                newValue,
                unpatchMode,
                warnOnUnexpectedPreviousValue,
                failOnUnexpectedPreviousValue
            });

            const valueToWrite = determineValueToWrite({
                offset,
                currentValue,
                previousValue,
                newValue,
                forcePatch,
                unpatchMode,
                nullPatch
            });

            if (valueToWrite !== null) {
                writeBuffer({ buffer: workingBuffer, value: valueToWrite, offset, skipWritePatch, byteLength, bigEndian, verifyPatch });
            }
            return workingBuffer;
        } catch (error: any) {
            logError(`An error has occurred: ${error}`);
            throw error;
        }
    }

    function patternToBuffer(pattern: Buffer | string | number[]): Buffer {
        if (Buffer.isBuffer(pattern))
            return pattern;
        if (typeof pattern === 'string')
            return Buffer.from(pattern.replace(/\s+/g, ''), 'hex');
        return Buffer.from(pattern);
    }

    /**
     * Patch offsets in a large file using fs read/write with position.
     *
     * The provided {@link patchData} array is not mutated; patches are applied
     * using a shallow copy sorted by offset to minimize costly seek
     * operations.
     *
     * @param params.filePath Path to file
     * @param params.patchData Array of patch objects
     * @param params.options Patch options
     * @since 0.0.2
     */
    export async function patchLargeFile({ filePath, patchData, options, progressInterval }:
        { filePath: string, patchData: PatchArray, options: OptionsType, progressInterval?: number }): Promise<void> {

        const {
            forcePatch,
            unpatchMode,
            nullPatch,
            failOnUnexpectedPreviousValue,
            warnOnUnexpectedPreviousValue,
            skipWritePatch,
            allowOffsetOverflow,
            bigEndian = false,
            verifyPatch = false
        } = options;

        let handle: fs.FileHandle | undefined;
        try {
            handle = await fs.open(filePath, 'r+');
            const stats = await handle!.stat();
            const fileSize: number = Number(stats.size);
            const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);

            let fileBuffer: Buffer | undefined;
            if (patchData.some(p => p.pattern !== undefined))
                fileBuffer = await handle.readFile();

            const resolved: PatchArray = [];
            for (const patch of patchData) {
                if (patch.pattern) {
                    const patternBuf = patternToBuffer(patch.pattern);
                    const idx = fileBuffer!.indexOf(patternBuf);
                    if (idx === -1) {
                        logWarn(`Pattern not found, skipping patch`);
                        continue;
                    }
                    resolved.push({ ...patch, offset: BigInt(idx) });
                } else if (patch.offset !== undefined)
                    resolved.push(patch);
            }

            const sorted = [...resolved].sort((a, b) => a.offset! === b.offset! ? 0 : (a.offset! < b.offset! ? -1 : 1));
            const total: number = sorted.length;
            let processed = 0;
            for (const patch of sorted) {
                const { offset, previousValue, newValue, byteLength } = patch;
                if (offset! < 0n) {
                    logWarn(`Offset ${offset} is negative, skipping patch`);
                    continue;
                }
                if (offset! > maxSafe)
                    throw new Error(`Offset ${offset} exceeds Number.MAX_SAFE_INTEGER`);
                const position = Number(offset!);
                if (position + byteLength > fileSize && allowOffsetOverflow !== true) {
                    logWarn(`Offset ${offset} with length ${byteLength} exceeds file size ${fileSize}, skipping patch`);
                    continue;
                }
                const buf = Buffer.alloc(byteLength);
                await handle!.read(buf, 0, byteLength, position);
                const currentValue = readValue({ buffer: buf, offset: 0, byteLength, bigEndian });

                validatePatchValues({
                    offset: offset!,
                    currentValue,
                    previousValue,
                    newValue,
                    unpatchMode,
                    warnOnUnexpectedPreviousValue,
                    failOnUnexpectedPreviousValue
                });

                const valueToWrite = determineValueToWrite({
                    offset: offset!,
                    currentValue,
                    previousValue,
                    newValue,
                    forcePatch,
                    unpatchMode,
                    nullPatch
                });

                if (valueToWrite !== null && skipWritePatch === false) {
                    writeValue({ buffer: buf, value: valueToWrite, offset: 0, byteLength, bigEndian });
                    await handle!.write(buf, 0, byteLength, position);
                    if (verifyPatch === true) {
                        const verifyBuf = Buffer.alloc(byteLength);
                        await handle!.read(verifyBuf, 0, byteLength, position);
                        verifyValue({ buffer: verifyBuf, value: valueToWrite, offset: 0, byteLength, bigEndian });
                    }
                } else if (valueToWrite !== null) {
                    logInfo(`Skipping buffer write`);
                }
                processed++;
                if (progressInterval && progressInterval > 0 && (processed % progressInterval === 0 || processed === total))
                    logInfo(`Processed ${processed}/${total} patches`);
            }
        } finally {
            if (handle)
                await handle.close();
        }
    }

    export function patchMultipleOffsets({ buffer, patchData, options, progressInterval }:
        { buffer: Buffer, patchData: PatchArray, options: OptionsType, progressInterval?: number }): Buffer {

        let working = buffer;
        const fileSize: number = working.length;
        const total: number = patchData.length;
        let processed = 0;
        for (const patch of patchData) {
            const { previousValue, newValue, byteLength } = patch;
            let offsetNumber: number | undefined;
            if (patch.pattern) {
                const patternBuf = patternToBuffer(patch.pattern);
                const idx = working.indexOf(patternBuf);
                if (idx === -1) {
                    logWarn(`Pattern not found, skipping patch`);
                    continue;
                }
                offsetNumber = idx;
            } else if (patch.offset !== undefined) {
                offsetNumber = Number(patch.offset);
            }
            if (offsetNumber === undefined) {
                logWarn(`No offset or pattern provided, skipping patch`);
                continue;
            }
            const { forcePatch, unpatchMode, nullPatch, failOnUnexpectedPreviousValue, warnOnUnexpectedPreviousValue, skipWritePatch, allowOffsetOverflow, verifyPatch, bigEndian } = options;
            if (offsetNumber >= fileSize && allowOffsetOverflow !== true) {
                logWarn(`Offset ${offsetNumber} exceeds file size ${fileSize}, skipping patch`);
                continue;
            }
            working = patchBuffer({
                buffer: working, offset: offsetNumber, previousValue, newValue, byteLength,
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
            processed++;
            if (progressInterval && progressInterval > 0 && (processed % progressInterval === 0 || processed === total))
                logInfo(`Processed ${processed}/${total} patches`);
        }
        return working;
    }

    function validatePatchValues({
        offset,
        currentValue,
        previousValue,
        newValue,
        unpatchMode,
        warnOnUnexpectedPreviousValue,
        failOnUnexpectedPreviousValue
    }:{
        offset: number | bigint,
        currentValue: number | bigint,
        previousValue: number | bigint,
        newValue: number | bigint,
        unpatchMode: boolean,
        warnOnUnexpectedPreviousValue: boolean,
        failOnUnexpectedPreviousValue: boolean
    }): void {
        if ((failOnUnexpectedPreviousValue === true && currentValue !== previousValue && unpatchMode === false) ||
            (failOnUnexpectedPreviousValue === true && currentValue !== newValue && unpatchMode === true)) {
            let expectedValue: number | bigint = previousValue;
            if (unpatchMode === true)
                expectedValue = newValue;
            throw new Error(`Found unexpected previous value at offset ${offset}: ${currentValue}, expected ${expectedValue}`);
        }

        if ((warnOnUnexpectedPreviousValue === true && currentValue !== previousValue && unpatchMode === false) ||
            (warnOnUnexpectedPreviousValue === true && currentValue !== newValue && unpatchMode === true)) {
            let value: number | bigint = previousValue;
            if (unpatchMode === true)
                value = newValue;
            logWarn(`Found unexpected previous value at offset ${offset}: ${currentValue}, expected ${value}`);
        }
    }

    function determineValueToWrite({
        offset,
        currentValue,
        previousValue,
        newValue,
        forcePatch,
        unpatchMode,
        nullPatch
    }:{
        offset: number | bigint,
        currentValue: number | bigint,
        previousValue: number | bigint,
        newValue: number | bigint,
        forcePatch: boolean,
        unpatchMode: boolean,
        nullPatch: boolean
    }): number | bigint | null {
        if (currentValue === newValue && unpatchMode === false) {
            logWarn(`Offset is already patched ${offset}: ${currentValue}, new value ${newValue}`);
            return null;
        }
        if (currentValue === previousValue && unpatchMode === true) {
            logWarn(`Offset is already unpatched ${offset}: ${currentValue}, previous value ${previousValue}`);
            return null;
        }

        if (forcePatch === true) {
            if (nullPatch === true) {
                logWarn(`Force null patching offset ${offset}`);
                return 0;
            }
            if (unpatchMode === true) {
                logWarn(`Force unpatching offset ${offset}`);
                return previousValue;
            }
            logWarn(`Force patching offset ${offset}`);
            return newValue;
        }

        if (previousValue === currentValue) {
            if (nullPatch === true) {
                logWarn(`Null patching offset ${offset}`);
                return 0;
            }
            if (unpatchMode === true) {
                logInfo(`Unpatching offset ${offset}`);
                return previousValue;
            }
            logInfo(`Patching offset ${offset}`);
            return newValue;
        }

        return null;
    }

    function readValue({ buffer, offset, byteLength, bigEndian }:
        { buffer: Buffer, offset: number, byteLength: 1 | 2 | 4 | 8, bigEndian: boolean }): number | bigint {
        switch (byteLength) {
            case 1:
                return buffer.readUInt8(offset);
            case 2:
                return bigEndian ? buffer.readUInt16BE(offset) : buffer.readUInt16LE(offset);
            case 4:
                return bigEndian ? buffer.readUInt32BE(offset) : buffer.readUInt32LE(offset);
            case 8:
                return bigEndian ? buffer.readBigUInt64BE(offset) : buffer.readBigUInt64LE(offset);
            default:
                throw new Error(`Unsupported byte length ${byteLength}`);
        }
    }

    function writeValue({ buffer, value, offset, byteLength, bigEndian }:
        { buffer: Buffer, value: number | bigint, offset: number, byteLength: 1 | 2 | 4 | 8, bigEndian: boolean }): void {
        switch (byteLength) {
            case 1:
                buffer.writeUInt8(Number(value), offset);
                break;
            case 2:
                if (bigEndian)
                    buffer.writeUInt16BE(Number(value), offset);
                else
                    buffer.writeUInt16LE(Number(value), offset);
                break;
            case 4:
                if (bigEndian)
                    buffer.writeUInt32BE(Number(value), offset);
                else
                    buffer.writeUInt32LE(Number(value), offset);
                break;
            case 8:
                if (bigEndian)
                    buffer.writeBigUInt64BE(BigInt(value), offset);
                else
                    buffer.writeBigUInt64LE(BigInt(value), offset);
                break;
            default:
                throw new Error(`Unsupported byte length ${byteLength}`);
        }
    }

    function verifyValue({ buffer, value, offset, byteLength, bigEndian }:
        { buffer: Buffer, value: number | bigint, offset: number, byteLength: 1 | 2 | 4 | 8, bigEndian: boolean }): void {
        const verify = readValue({ buffer, offset, byteLength, bigEndian });
        if (verify !== value)
            throw new Error(`Failed to verify patch at offset ${offset}: ${verify}, expected ${value}`);
    }


    /**
     * Write a value to a buffer 
     * 
     * @param params.buffer Buffer to manipulate
     * @param params.value Decimal value to write
     * @param params.offset Decimal offset 
     * @param params.skipWritePatch Skip writing path to buffer?
     * @example
     * ```
     * writeBuffer({ buffer, value, offset, skipWritePatch });
     * ```
     * @returns Nada
     * @since 0.0.1
     */
    function writeBuffer({ buffer, value, offset, skipWritePatch, byteLength, bigEndian, verifyPatch }:
        { buffer: Buffer, value: number | bigint, offset: number, skipWritePatch: boolean, byteLength: 1 | 2 | 4 | 8, bigEndian: boolean, verifyPatch: boolean }): void {
        if (skipWritePatch === false)
            writeValue({ buffer, value, offset, byteLength, bigEndian });
        else
            logInfo(`Skipping buffer write`);

        if (skipWritePatch === false && verifyPatch === true) {
            verifyValue({ buffer, value, offset, byteLength, bigEndian });
        }
    }

    /**
     * Truncate a buffer
     * 
     * @param params.buffer Buffer to truncate
     * @example
     * ```
     * truncateBuffer({ buffer, maxLength });
     * ```
     * @param params.buffer Buffer to truncate
     * @param params.maxLength Maximum length of buffer to return (default 200)
     * @returns Truncated buffer
     * @since 0.0.1
     */
    export function truncateBuffer({ buffer, maxLength = 200 }:
        { buffer: Buffer; maxLength?: number }) {
        if (buffer.length <= maxLength)
            return buffer;
        return buffer.subarray(0, maxLength);
    }
}

export default BufferUtils;
