import Debug from '../auxiliary/debug.js';
const { log } = Debug;

import colorsCli from 'colors-cli';
const { white } = colorsCli;

export namespace BufferWrappers {
    /**
     * Create a new buffer
     * 
     * @param params.size Buffer size
     * @example
     * ```
     * createBuffer({ size });
     * ```
     * @returns Buffer with defined size
     * @since 0.0.1
     */
    export function createBuffer({ size }:
        { size: number }): Buffer {

        const newBuffer: Buffer = Buffer.alloc(size);
        const newBufferSize: number = newBuffer.byteLength;
        log({ message: `Created buffer with size: ${newBufferSize}`, color: white });
        return newBuffer;
    }
}

export default BufferWrappers;
