import BufferWrappers from '../patches/buffer.wrappers.js';
const { createBuffer } = BufferWrappers;

import Debug from '../auxiliary/debug.js';
const { log } = Debug;

import colorsCli from 'colors-cli';
const { white, yellow_bt, red_bt } = colorsCli;

import { OptionsType } from '../patches/buffer.types.js';

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
        options = {
            forcePatch: false,
            unpatchMode: false,
            nullPatch: false,
            failOnUnexpectedPreviousValue: false,
            warnOnUnexpectedPreviousValue: true,
            skipWritePatch: false
        } }:
        {
            buffer: Buffer,
            offset: number,
            previousValue: number,
            newValue: number,
            options: OptionsType
        }): Buffer {


        const {
            forcePatch,
            unpatchMode,
            nullPatch,
            failOnUnexpectedPreviousValue,
            warnOnUnexpectedPreviousValue,
            skipWritePatch
        } = options;
        try {
            const currentValue: number = buffer.readUInt8(offset);

            if ((failOnUnexpectedPreviousValue === true && currentValue !== previousValue && unpatchMode === false) ||
                (failOnUnexpectedPreviousValue === true && currentValue !== newValue && unpatchMode === true)) {
                var expectedValue: number = previousValue;
                if (unpatchMode === true)
                    expectedValue = newValue;
                throw new Error(`Found unexpected previous value at offset ${offset}: ${currentValue}, expected ${expectedValue}`);
            }

            if ((warnOnUnexpectedPreviousValue === true && currentValue !== previousValue && unpatchMode === false) ||
                (warnOnUnexpectedPreviousValue === true && currentValue !== newValue && unpatchMode === true)) {
                var value: number = previousValue;
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
                    writeBuffer({ buffer, value: 0, offset, skipWritePatch });
                } else {
                    if (unpatchMode === true) {
                        log({ message: `Force unpatching offset ${offset}`, color: yellow_bt });
                        writeBuffer({ buffer, value: previousValue, offset, skipWritePatch });
                    } else {
                        log({ message: `Force patching offset ${offset}`, color: yellow_bt });
                        writeBuffer({ buffer, value: newValue, offset, skipWritePatch });
                    }
                }
            } else {
                if (previousValue === currentValue) {
                    if (nullPatch === true) {
                        log({ message: `Null patching offset ${offset}`, color: yellow_bt });
                        writeBufferNull({ buffer, offset, skipWritePatch });
                    } else {
                        if (unpatchMode === true) {
                            log({ message: `Unpatching offset ${offset}`, color: white });
                            writeBuffer({ buffer, value: previousValue, offset, skipWritePatch });
                        } else {
                            log({ message: `Patching offset ${offset}`, color: white });
                            writeBuffer({ buffer, value: newValue, offset, skipWritePatch });
                        }
                    }
                }
            }
            return buffer;
        } catch (error: any) {
            log({ message: `An error has occurred: ${error}`, color: red_bt });
            const errorBufferSize: number = 0;
            return createBuffer({ size: errorBufferSize });
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
    function writeBufferNull({ buffer, offset, skipWritePatch }:
        { buffer: Buffer, offset: number, skipWritePatch: boolean }): void {
        const nullValue: number = 0;
        writeBuffer({ buffer, value: nullValue, offset, skipWritePatch });
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
    function writeBuffer({ buffer, value, offset, skipWritePatch }:
        { buffer: Buffer, value: number, offset: number, skipWritePatch: boolean }): void {
        if (skipWritePatch === false)
            buffer.writeUInt8(value, offset);
        else
            log({ message: `Skipping buffer write`, color: white });
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
