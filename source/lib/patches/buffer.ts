import * as fs from 'fs/promises';

import Debug from '../auxiliary/debug.js';
const { log } = Debug;

import colorsCli from 'colors-cli';
const { white, yellow_bt, red_bt } = colorsCli;

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
            if (allowOffsetOverflow !== true && offset + byteLength > buffer.length) {
                log({ message: `Offset ${offset} with length ${byteLength} exceeds buffer size ${buffer.length}, skipping patch`, color: yellow_bt });
                return buffer;
            }
            let currentValue: number | bigint;
            switch (byteLength) {
                case 1:
                    currentValue = buffer.readUInt8(offset);
                    break;
                case 2:
                    currentValue = bigEndian ? buffer.readUInt16BE(offset) : buffer.readUInt16LE(offset);
                    break;
                case 4:
                    currentValue = bigEndian ? buffer.readUInt32BE(offset) : buffer.readUInt32LE(offset);
                    break;
                case 8:
                    currentValue = bigEndian ? buffer.readBigUInt64BE(offset) : buffer.readBigUInt64LE(offset);
                    break;
                default:
                    throw new Error(`Unsupported byte length ${byteLength}`);
            }

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

                log({ message: `Found unexpected previous value at offset ${offset}: ${currentValue}, expected ${value}`, color: yellow_bt });
            }

            if (currentValue === newValue && unpatchMode === false) {
                log({ message: `Offset is already patched ${offset}: ${currentValue}, new value ${newValue}`, color: yellow_bt });
                return buffer;
            }
            if (currentValue === previousValue && unpatchMode === true) {
                log({ message: `Offset is already unpatched ${offset}: ${currentValue}, previous value ${previousValue}`, color: yellow_bt });
                return buffer;
            }

            if (forcePatch === true) {
                if (nullPatch === true) {
                    log({ message: `Force null patching offset ${offset}`, color: yellow_bt });
                    writeBuffer({ buffer, value: 0, offset, skipWritePatch, byteLength, bigEndian, verifyPatch });
                } else {
                    if (unpatchMode === true) {
                        log({ message: `Force unpatching offset ${offset}`, color: yellow_bt });
                        writeBuffer({ buffer, value: previousValue, offset, skipWritePatch, byteLength, bigEndian, verifyPatch });
                    } else {
                        log({ message: `Force patching offset ${offset}`, color: yellow_bt });
                        writeBuffer({ buffer, value: newValue, offset, skipWritePatch, byteLength, bigEndian, verifyPatch });
                    }
                }
            } else {
                if (previousValue === currentValue) {
                    if (nullPatch === true) {
                        log({ message: `Null patching offset ${offset}`, color: yellow_bt });
                        writeBufferNull({ buffer, offset, skipWritePatch, byteLength, bigEndian, verifyPatch });
                    } else {
                        if (unpatchMode === true) {
                            log({ message: `Unpatching offset ${offset}`, color: white });
                                writeBuffer({ buffer, value: previousValue, offset, skipWritePatch, byteLength, bigEndian, verifyPatch });
                        } else {
                            log({ message: `Patching offset ${offset}`, color: white });
                                writeBuffer({ buffer, value: newValue, offset, skipWritePatch, byteLength, bigEndian, verifyPatch });
                        }
                    }
                }
            }
            return buffer;
        } catch (error: any) {
            log({ message: `An error has occurred: ${error}`, color: red_bt });
            throw error;
        }
    }

    /**
     * Patch offsets in a large file using fs read/write with position
     *
     * @param params.filePath Path to file
     * @param params.patchData Array of patch objects
     * @param params.options Patch options
     * @since 0.0.2
     */
    export async function patchLargeFile({ filePath, patchData, options }:
        { filePath: string, patchData: PatchArray, options: OptionsType }): Promise<void> {

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

        const handle = await fs.open(filePath, 'r+');
        const stats = await handle.stat();
        const fileSize: number = Number(stats.size);
        try {
            const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
            for (const patch of patchData) {
                const { offset, previousValue, newValue, byteLength } = patch;
                if (offset > maxSafe)
                    throw new Error(`Offset ${offset} exceeds Number.MAX_SAFE_INTEGER`);
                const position = Number(offset);
                if (position + byteLength > fileSize && allowOffsetOverflow !== true) {
                    log({ message: `Offset ${offset} with length ${byteLength} exceeds file size ${fileSize}, skipping patch`, color: yellow_bt });
                    continue;
                }
                const buf = Buffer.alloc(byteLength);
                await handle.read(buf, 0, byteLength, position);
                let currentValue: number | bigint;
                switch (byteLength) {
                    case 1:
                        currentValue = buf.readUInt8(0);
                        break;
                    case 2:
                        currentValue = bigEndian ? buf.readUInt16BE(0) : buf.readUInt16LE(0);
                        break;
                    case 4:
                        currentValue = bigEndian ? buf.readUInt32BE(0) : buf.readUInt32LE(0);
                        break;
                    case 8:
                        currentValue = bigEndian ? buf.readBigUInt64BE(0) : buf.readBigUInt64LE(0);
                        break;
                    default:
                        throw new Error(`Unsupported byte length ${byteLength}`);
                }

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
                    log({ message: `Found unexpected previous value at offset ${offset}: ${currentValue}, expected ${value}`, color: yellow_bt });
                }

                let valueToWrite: number | bigint | null = null;

                if (currentValue === newValue && unpatchMode === false) {
                    log({ message: `Offset is already patched ${offset}: ${currentValue}, new value ${newValue}`, color: yellow_bt });
                } else if (currentValue === previousValue && unpatchMode === true) {
                    log({ message: `Offset is already unpatched ${offset}: ${currentValue}, previous value ${previousValue}`, color: yellow_bt });
                } else if (forcePatch === true) {
                    if (nullPatch === true) {
                        log({ message: `Force null patching offset ${offset}`, color: yellow_bt });
                        valueToWrite = 0;
                    } else {
                        if (unpatchMode === true) {
                            log({ message: `Force unpatching offset ${offset}`, color: yellow_bt });
                            valueToWrite = previousValue;
                        } else {
                            log({ message: `Force patching offset ${offset}`, color: yellow_bt });
                            valueToWrite = newValue;
                        }
                    }
                } else {
                    if (previousValue === currentValue) {
                        if (nullPatch === true) {
                            log({ message: `Null patching offset ${offset}`, color: yellow_bt });
                            valueToWrite = 0;
                        } else {
                            if (unpatchMode === true) {
                                log({ message: `Unpatching offset ${offset}`, color: white });
                                valueToWrite = previousValue;
                            } else {
                                log({ message: `Patching offset ${offset}`, color: white });
                                valueToWrite = newValue;
                            }
                        }
                    }
                }

                if (valueToWrite !== null && skipWritePatch === false) {
                    switch (byteLength) {
                        case 1:
                            buf.writeUInt8(Number(valueToWrite), 0);
                            break;
                        case 2:
                            if (bigEndian)
                                buf.writeUInt16BE(Number(valueToWrite), 0);
                            else
                                buf.writeUInt16LE(Number(valueToWrite), 0);
                            break;
                        case 4:
                            if (bigEndian)
                                buf.writeUInt32BE(Number(valueToWrite), 0);
                            else
                                buf.writeUInt32LE(Number(valueToWrite), 0);
                            break;
                        case 8:
                            if (bigEndian)
                                buf.writeBigUInt64BE(BigInt(valueToWrite), 0);
                            else
                                buf.writeBigUInt64LE(BigInt(valueToWrite), 0);
                            break;
                    }
                    await handle.write(buf, 0, byteLength, position);
                    if (verifyPatch === true) {
                        const verifyBuf = Buffer.alloc(byteLength);
                        await handle.read(verifyBuf, 0, byteLength, position);
                        let verifyValue: number | bigint;
                        switch (byteLength) {
                            case 1:
                                verifyValue = verifyBuf.readUInt8(0);
                                break;
                            case 2:
                                verifyValue = bigEndian ? verifyBuf.readUInt16BE(0) : verifyBuf.readUInt16LE(0);
                                break;
                            case 4:
                                verifyValue = bigEndian ? verifyBuf.readUInt32BE(0) : verifyBuf.readUInt32LE(0);
                                break;
                            case 8:
                                verifyValue = bigEndian ? verifyBuf.readBigUInt64BE(0) : verifyBuf.readBigUInt64LE(0);
                                break;
                            default:
                                throw new Error(`Unsupported byte length ${byteLength}`);
                        }
                        if (verifyValue !== valueToWrite)
                            throw new Error(`Failed to verify patch at offset ${offset}: ${verifyValue}, expected ${valueToWrite}`);
                    }
                } else if (valueToWrite !== null) {
                    log({ message: `Skipping buffer write`, color: white });
                }
            }
        } finally {
            await handle.close();
        }
    }

    /**
     * Write a null value to a buffer
     * 
     * @param params.buffer Buffer to manipulate
     * @param params.offset Decimal offset
     * @param params.skipWritePatch Skip writing path to buffer?
     * @example
     * ```
     * writeBufferNull({ buffer, offset, skipWritePatch });
     * ```
     * @returns
     * @since 0.0.1
     */
    function writeBufferNull({ buffer, offset, skipWritePatch, byteLength, bigEndian, verifyPatch }:
        { buffer: Buffer, offset: number, skipWritePatch: boolean, byteLength: 1 | 2 | 4 | 8, bigEndian: boolean, verifyPatch: boolean }): void {
        const nullValue: number = 0;
        writeBuffer({ buffer, value: nullValue, offset, skipWritePatch, byteLength, bigEndian, verifyPatch });
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
            }
        else
            log({ message: `Skipping buffer write`, color: white });

        if (skipWritePatch === false && verifyPatch === true) {
            let verifyValue: number | bigint;
            switch (byteLength) {
                case 1:
                    verifyValue = buffer.readUInt8(offset);
                    break;
                case 2:
                    verifyValue = bigEndian ? buffer.readUInt16BE(offset) : buffer.readUInt16LE(offset);
                    break;
                case 4:
                    verifyValue = bigEndian ? buffer.readUInt32BE(offset) : buffer.readUInt32LE(offset);
                    break;
                case 8:
                    verifyValue = bigEndian ? buffer.readBigUInt64BE(offset) : buffer.readBigUInt64LE(offset);
                    break;
                default:
                    throw new Error(`Unsupported byte length ${byteLength}`);
            }
            if (verifyValue !== value)
                throw new Error(`Failed to verify patch at offset ${offset}: ${verifyValue}, expected ${value}`);
        }
    }

    /**
     * Truncate a buffer
     * 
     * @param params.buffer Buffer to truncate
     * @example
     * ```
     * truncateBuffer({ buffer });
     * ```
     * @returns Truncated buffer
     * @since 0.0.1
     */
    export function truncateBuffer({ buffer }:
        { buffer: Buffer }) {
        if (buffer.length < 200)
            return buffer;
        return buffer.subarray(0, 200);
    }
}

export default BufferUtils;
