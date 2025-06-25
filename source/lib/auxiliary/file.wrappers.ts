import { Stats } from 'fs';
import { access, constants, copyFile, unlink, rm, readdir, open } from 'fs/promises';
import { basename } from 'path';

import { FileHandle } from 'fs/promises';

import Debug from './debug.js';
const { log } = Debug;

import colorsCli from 'colors-cli';
const { red_bt, white } = colorsCli;

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
        const fileHandle: FileHandle = await open(filePath);
        const fileSize: number = await getFileSize({ fileHandle });
        await fileHandle.close();
        return fileSize;
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
    export const getFileSizeUsingHandle = getFileSize;

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
        const callingModule: string | undefined = module.parent?.filename;
        if (callingModule) {
            const convertedCallingModule: string = callingModule.toString();
            const filename: string = basename(convertedCallingModule);
            return filename;
        } else {
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
            log({ message: `Deleted file: ${filePath}`, color: white });
        } catch (error) {
            log({ message: `Failed to delete file: ${error}`, color: red_bt });
        }
    }
    export const delFile = deleteFile;


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
            log({ message: `Deleted folder: ${folderPath}`, color: white });
        } catch (error) {
            log({ message: `Failed to delete folder: ${error}`, color: red_bt });
        }

    }
    export const delFolder = deleteFolder;
    export const delFol = deleteFolder;

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

        return new Promise(function (resolve, reject) {
            readdir(folderPath)
                .then(function (filenames) {
                    const completeFilePath: string = `${folderPath}\\${filenames[0]}`;
                    resolve(completeFilePath);
                }).catch(function (error) {
                    reject(error);
                });
        });
    }
}

export default FileWrappers;
