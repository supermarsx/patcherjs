import * as fs from 'fs/promises';
import { open } from 'fs/promises';

import BufferWrappers from '../patches/buffer.wrappers.js';
const { createBuffer } = BufferWrappers;

import FileWrappers from './file.wrappers.js';
const { isFileReadable, isFileWritable, getFileSize } = FileWrappers;

import { FileHandle } from 'fs/promises';

import Debug from './debug.js';
const { log } = Debug;

import colorsCli from 'colors-cli';
const { green_bt, red_bt, white, yellow_bt } = colorsCli;

export * from './file.wrappers.js';

export namespace File {

    export const backupFile = FileWrappers.backupFile;
    export const deleteFile = FileWrappers.deleteFile;
    export const deleteFolder = FileWrappers.deleteFolder;
    export const firstFilenameInFolder = FileWrappers.firstFilenameInFolder;
    export const getFileSizeUsingPath = FileWrappers.getFileSizeUsingPath;

    /**
     * Read a patch file to a string variable
     * 
     * @param params.filePath File path of the patch file
     * @example
     * ```
     * readPatchFile({ filePath });
     * ```
     * @returns String formatted patch file contents
     * @since 0.0.1
     */
    export async function readPatchFile({ filePath }:
        { filePath: string; }): Promise<string> {
        try {
            const encoding: BufferEncoding = 'utf-8';
            log({ message: `Opening file path, ${filePath}, in read mode`, color: white });
            const cantReadFile: boolean = await !(isFileReadable({ filePath }));
            if (cantReadFile)
                throw new Error(`File is not readable, is missing or corrupted`);
            const fileHandle: FileHandle = await open(filePath);
            const bufferSize: number = await getFileSize({ fileHandle });
            if (bufferSize === 0)
                log({ message: 'File size is 0, file may be corrupted or invalid', color: yellow_bt });
            else
                log({ message: `Patch file size, ${bufferSize}`, color: green_bt });
            log({ message: `Reading file handle with ${encoding} encoding`, color: white });
            const fileData: string = await fileHandle.readFile({
                encoding: encoding
            });
            const dataLength: number = fileData.length;
            if (dataLength === 0)
                log({ message: `Patch file data size is 0, file may be corrupted or invalid`, color: yellow_bt });
            else
                log({ message: `Read patch file successfully to buffer`, color: green_bt });
            await fileHandle.close();
            log({ message: `Closed file handle`, color: white });
            return fileData;
        } catch (error: any) {
            log({ message: `An error has occurred: ${error}`, color: red_bt });
            return '';
        }
    }

    /**
     * Read a binary file to a buffer
     * 
     * @param params.filePath Binary file path
     * @example
     * ```
     * readBinaryFile({ filePath });
     * ```
     * @returns Buffer containing file contents, empty buffer on failure
     * @since 0.0.1
     */
    export async function readBinaryFile({ filePath }:
        { filePath: string; }): Promise<Buffer> {
        try {
            log({ message: `Opening file path, ${filePath}, in read mode`, color: white });
            if (await !(isFileReadable({ filePath })))
                throw new Error(`File is not readable, is missing or corrupted`);
            const fileHandle: FileHandle = await open(filePath);
            log({ message: 'Getting file size', color: white });
            const bufferSize: number = await getFileSize({ fileHandle });
            if (bufferSize === 0)
                log({ message: 'File size is 0, file may be corrupted or invalid', color: yellow_bt });
            else
                log({ message: `Binary file size, ${bufferSize}`, color: green_bt });
            log({ message: 'Creating buffer', color: white });
            const buffer: Buffer = createBuffer({ size: bufferSize });
            log({ message: 'Reading file handle to buffer', color: white });
            await fileHandle.read(buffer, 0, bufferSize);
            log({ message: 'Read binary file successfully to buffer', color: green_bt });
            await fileHandle.close();
            log({ message: 'Closed file handle', color: white });
            return buffer;
        } catch (error: any) {
            log({ message: `An error has occurred: ${error}`, color: red_bt });
            return createBuffer({ size: 0 });
        }
    }
    export const readFile = readBinaryFile;

    /**
     * Write a buffer to file
     * 
     * @param params.filePath Binary file path
     * @param params.buffer Buffer to write
     * @example
     * ```
     * writeBinaryFile({ filePath, buffer });
     * ``` 
     * @returns Bytes written to file, 0 on failure or if empty
     * @since 0.0.1
     */
    export async function writeBinaryFile({ filePath, buffer }: {
        filePath: string, buffer: Buffer
    }): Promise<number> {
        try {
            log({ message: `Opening file path, ${filePath}, in write mode`, color: white });
            if (await !(isFileWritable({ filePath })))
                throw new Error(`File is not writable, is missing or corrupted`);
            const flags: string = 'w';
            const fileHandle: fs.FileHandle = await fs.open(filePath, flags);
            const bufferSize: number = await getFileSize({ fileHandle });
            if (bufferSize === 0)
                log({ message: 'File size is 0, file may be corrupted, invalid or is a new file/buffer', color: yellow_bt });
            else
                log({ message: `Binary file size, ${bufferSize}`, color: green_bt });
            log({ message: 'Writing buffer to file handle', color: white });
            const writeResult: { bytesWritten: number } = await fileHandle.write(buffer);
            const { bytesWritten } = writeResult;
            log({ message: `Written ${bytesWritten} bytes to file`, color: green_bt });
            await fileHandle.close();
            log({ message: 'Closed file handle', color: white });
            return bytesWritten;
        } catch (error: any) {
            log({ message: `An error has occurred: ${error}`, color: red_bt });
            return 0;
        }
    }
    export const writeFile = writeBinaryFile;
}

export default File;