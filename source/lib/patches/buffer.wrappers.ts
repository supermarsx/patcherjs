import Logger from '../auxiliary/logger.js';
const { logInfo } = Logger;

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
        logInfo(`Created buffer with size: ${newBufferSize}`);
        return newBuffer;
    }
}

export default BufferWrappers;
