import { Stats } from 'fs';
import { access, constants, copyFile, unlink, rm, readdir, open } from 'fs/promises';
import { basename, join } from 'path';
import { fileURLToPath } from 'url';

import { FileHandle } from 'fs/promises';

import Logger from './logger.js';
const { logInfo, logError } = Logger;

import Constants from '../configuration/constants.js';
const { PATCHES_BACKUPEXT } = Constants;

export namespace FileWrappers {
    /**
     * Get file size from a path
     * 
     * @param params.filePath File path
     * @example
     * ```
     * getFileSizeUsingPath({ filePath });
     * ```
     * @returns File size, 0 on failure
     * @since 0.0.1
     */
    export async function getFileSizeUsingPath({ filePath }:
        { filePath: string }): Promise<number> {
        let fileHandle: FileHandle | undefined;
        try {
            fileHandle = await open(filePath);
            const fileSize: number = await getFileSize({ fileHandle });
            return fileSize;
        } catch {
            return 0;
        } finally {
            if (fileHandle)
                await fileHandle.close();
        }
    }

    /**
     * Get file size from a file handle
     * 
     * @param params.fileHandle File handle
     * @example
     * ```
     * getFileSize({ fileHandle });
     * ```
     * @returns File size, 0 on failure
     * @since 0.0.1
     */
    export async function getFileSize({ fileHandle }:
        { fileHandle: FileHandle }): Promise<number> {
        try {
            const fileInfo: Stats = await fileHandle.stat();
            const fileSize: number = fileInfo.size;
            return fileSize;
        } catch {
            return 0;
        }
    }

    /**
     * Check if file is readable
     * 
     * @param params.filePath File path
     * @example
     * ```
     * isFileReadable({ filePath });
     * ```
     * @returns `true` if is readable, `false` if not or on failure
     * @since 0.0.1
     */
    export async function isFileReadable({ filePath }:
        { filePath: string }): Promise<boolean> {
        const { R_OK } = constants;
        try {
            await access(filePath, R_OK);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check if file is writable
     * 
     * @param params.filePath
     * @example
     * ```
     * isFileWritable({ filePath });
     * ```
     * @returns `true` if is writable, `false` if not or on failure
     * @since 0.0.1
     */
    export async function isFileWritable({ filePath }:
        { filePath: string }): Promise<boolean> {
        const { W_OK } = constants;
        try {
            await access(filePath, W_OK);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get function calling filename
     * 
     * @example
     * ```
     * getCallingFilename();
     * ```
     * @returns Filename of calling filename or empty string on failure
     * @since 0.0.1
     */
    export function getCallingFilename(): string {
        try {
            const stack: string | undefined = new Error().stack;
            if (stack) {
                const stackLines: string[] = stack.split('\n');
                const thisFile: string = fileURLToPath(import.meta.url);
                const thisIndex: number = stackLines.findIndex(function (line) {
                    return line.includes(thisFile);
                });
                if (thisIndex !== -1) {
                    let callerLine: string | undefined;
                    for (let i = thisIndex + 1; i < stackLines.length; i++) {
                        const line: string = stackLines[i];
                        if (!line.includes(thisFile)) {
                            callerLine = line;
                            break;
                        }
                    }
                    if (callerLine) {
                        const matchingRegExp: RegExp = /\((.*):\d+:\d+\)|at (.*):\d+:\d+$/;
                        const filenameMatch: RegExpMatchArray | null = callerLine.match(matchingRegExp);
                        if (filenameMatch !== null) {
                            const filename: string | undefined = filenameMatch[1] ?? filenameMatch[2];
                            if (filename)
                                return basename(fileURLToPath(filename));
                        }
                    }
                }
            }
            return '';
        } catch {
            return '';
        }
    }

    /**
     * Backup, copy a file using the predefined backup extension
     * 
     * @param params.filePath File path to copy
     * @example
     * ```
     * backupFile({ filePath });
     * ```
     * @returns Nada
     * @since 0.0.1
     */
    export async function backupFile({ filePath }:
        { filePath: string }): Promise<void> {
        try {
            const backupFilePath: string = `${filePath}${PATCHES_BACKUPEXT}`;
            await copyFile(filePath, backupFilePath);
        } catch (error) {
            throw new Error(`Failed to backup file with error: ${error}`);
        }
    }

    /**
     * Delete a file
     * 
     * @param params.filePath File path
     * @example
     * ```
     * deleteFile({ filePath });
     * ```
     * @returns Nada
     * @since 0.0.1
     */
    export async function deleteFile({ filePath }:
        { filePath: string }): Promise<void> {
        try {
            await unlink(filePath);
            logInfo(`Deleted file: ${filePath}`);
        } catch (error) {
            logError(`Failed to delete file: ${error}`);
        }
    }


    /**
     * Delete a folder 
     * 
     * @param params.folderPath Folder path
     * @example
     * ```
     * deleteFolder({ folderPath });
     * ```
     * @returns Nada
     * @since 0.0.1
     */
    export async function deleteFolder({ folderPath }:
        { folderPath: string }): Promise<void> {

        try {
            await rm(folderPath, { recursive: true });
            logInfo(`Deleted folder: ${folderPath}`);
        } catch (error) {
            logError(`Failed to delete folder: ${error}`);
        }

    }

    /**
     * Get first file within folder and return path of first file
     * 
     * @param params.folderPath Folder path
     * @example
     * ```
     * firstFilenameInFolder({ folderPath });
     * ```
     * @returns File path
     * @since 0.0.1
     */
    export async function firstFilenameInFolder({ folderPath }:
        { folderPath: string }): Promise<string> {

        const filenames: string[] = await readdir(folderPath);
        if (filenames.length === 0) {
            throw new Error('No files found in directory');
        }
        const completeFilePath: string = join(folderPath, filenames[0]);
        return completeFilePath;
    }
}

export default FileWrappers;
