import * as fs from 'fs/promises';

import BufferWrappers from '../patches/buffer.wrappers.js';
const { createBuffer } = BufferWrappers;

import FileWrappers from './file.wrappers.js';
const { isFileReadable, getFileSize } = FileWrappers;

import { FileHandle } from 'fs/promises';

import Logger from './logger.js';
const { logInfo, logSuccess, logWarn, logError } = Logger;

import { FileIOError } from '../errors/index.js';

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
        let fileHandle: FileHandle | undefined;
        try {
            const encoding: BufferEncoding = 'utf-8';
            logInfo(`Opening file path, ${filePath}, in read mode`);
            const cantReadFile: boolean = !(await isFileReadable({ filePath }));
            if (cantReadFile)
                throw new FileIOError(`File is not readable, is missing or corrupted`);
            fileHandle = await fs.open(filePath);
            const bufferSize: number = await getFileSize({ fileHandle });
            if (bufferSize === 0)
                logWarn('File size is 0, file may be corrupted or invalid');
            else
                logSuccess(`Patch file size, ${bufferSize}`);
            logInfo(`Reading file handle with ${encoding} encoding`);
            const fileData: string = await fileHandle.readFile({
                encoding: encoding
            });
            const dataLength: number = fileData.length;
            if (dataLength === 0)
                logWarn(`Patch file data size is 0, file may be corrupted or invalid`);
            else
                logSuccess(`Read patch file successfully to buffer`);
            return fileData;
        } catch (error: any) {
            logError(`An error has occurred: ${error}`);
            return '';
        } finally {
            if (fileHandle) {
                await fileHandle.close();
                logInfo(`Closed file handle`);
            }
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
        let fileHandle: FileHandle | undefined;
        try {
            logInfo(`Opening file path, ${filePath}, in read mode`);
            if (!(await isFileReadable({ filePath })))
                throw new FileIOError(`File is not readable, is missing or corrupted`);
            fileHandle = await fs.open(filePath);
            logInfo('Getting file size');
            const bufferSize: number = await getFileSize({ fileHandle });
            if (bufferSize === 0)
                logWarn('File size is 0, file may be corrupted or invalid');
            else
                logSuccess(`Binary file size, ${bufferSize}`);
            logInfo('Creating buffer');
            const buffer: Buffer = createBuffer({ size: bufferSize });
            logInfo('Reading file handle to buffer');
            await fileHandle.read(buffer, 0, bufferSize);
            logSuccess('Read binary file successfully to buffer');
            return buffer;
        } catch (error: any) {
            logError(`An error has occurred: ${error}`);
            return createBuffer({ size: 0 });
        } finally {
            if (fileHandle) {
                await fileHandle.close();
                logInfo('Closed file handle');
            }
        }
    }

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
        let fileHandle: fs.FileHandle | undefined;
        try {
            const fileExists: boolean = await isFileReadable({ filePath });
            const flags: string = fileExists ? 'r+' : 'a';
            logInfo(`Opening file path, ${filePath}, in ${fileExists ? 'read/write' : 'append'} mode`);
            fileHandle = await fs.open(filePath, flags);
            if (fileExists) {
                const originalSize: number = await getFileSize({ fileHandle });
                if (originalSize === 0)
                    logWarn('Original binary file size is 0, file may be corrupted or invalid');
                else
                    logSuccess(`Original binary file size, ${originalSize}`);
                await fileHandle.truncate(0);
            }
            logInfo('Writing buffer to file handle');
            const writeResult: { bytesWritten: number } = await fileHandle.write(buffer);
            const { bytesWritten } = writeResult;
            logSuccess(`Written ${bytesWritten} bytes to file`);
            const resultSize: number = await getFileSize({ fileHandle });
            if (resultSize === 0)
                logWarn('Resulting binary file size is 0, file may be corrupted or invalid');
            else
                logSuccess(`Resulting binary file size, ${resultSize}`);
            return bytesWritten;
        } catch (error: any) {
            logError(`An error has occurred: ${error}`);
            return 0;
        } finally {
            if (fileHandle) {
                await fileHandle.close();
                logInfo('Closed file handle');
            }
        }
    }
}

export default File;
