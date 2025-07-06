import tmp from 'tmp';
import Seven, { ZipStream } from 'node-7z';
import { basename, extname } from 'path';

import File from '../auxiliary/file.js';
const { deleteFile, deleteFolder, firstFilenameInFolder, readBinaryFile, writeBinaryFile } = File;

import Debug from '../auxiliary/debug.js';
const { log } = Debug;
import colorsCli from 'colors-cli';
const { white, yellow_bt } = colorsCli;

import Constants from '../configuration/constants.js';
const { SEVENZIPBIN_FILEPATH, PACKFILEEXTENSION, PACKMETHOD } = Constants;

export namespace Packer {
    /**
     * Pack a file using either a origin file path or a buffer
     * 
     * @param params.archivePath Archive path
     * @param params.buffer Buffer to pack if path isn't used
     * @param params.password Archive password
     * @param params.preserveSource Whether to keep the original file. Defaults to `true`.
     * @remarks
     * Use either path or buffer as input
     * @example
     * ```
     * packFile({ archivePath, buffer, password });
     * ```
     * @returns Packed buffer
     * @since 0.0.1
     */
    export async function packFile({ archivePath, buffer, password, preserveSource = true }:
        { archivePath?: string, buffer?: Buffer, password: string, preserveSource?: boolean }): Promise<Buffer> {
        log({ message: `Packing file`, color: white });
        let sourcePath: string;
        let usedTemp = false;
        if (archivePath) {
            sourcePath = archivePath;
        } else {
            if (buffer && Buffer.isBuffer(buffer)) {
                const tempFilePath = tmp.tmpNameSync();
                await writeBinaryFile({ filePath: tempFilePath, buffer });
                sourcePath = tempFilePath;
                usedTemp = true;
            } else {
                log({ message: `Failed to get buffer or path, packing will fail`, color: yellow_bt });
                sourcePath = '';
            }
        }

        log({ message: `Pack source path is ${sourcePath}`, color: white });
        const destinationPath: string = getPackedPath({ filePath: sourcePath });
        log({ message: `Pack destination path is ${destinationPath}`, color: white });
        const options: {} = {
            method: PACKMETHOD,
            $bin: SEVENZIPBIN_FILEPATH,
            password: password
        };

        try {
            await packFileWrapper({ destinationPath, sourcePath, options });
            log({ message: `Packed file successfully`, color: white });
            const packedBuffer: Buffer = await readBinaryFile({ filePath: destinationPath });
            return packedBuffer;
        } finally {
            await deleteFile({ filePath: destinationPath });
            if (!preserveSource || usedTemp) {
                await deleteFile({ filePath: sourcePath });
            }
        }
    }

    /**
     * Compress a file using 7-zip
     * 
     * @param params.destinationPath Archive destination path
     * @param params.sourcePath Source file or files (intended to be used with a single file)
     * @param params.options Compression options, `method` specifying the compression method, `$bin` 7zip binary path and `password` specifying the archive password
     * @example
     * ```
     * packFileWrapper({ destinationPath, sourcePath, options });
     * ```
     * @returns Nada
     * @since 0.0.1
     */
    export async function packFileWrapper({ destinationPath, sourcePath, options }:
        { destinationPath: string, sourcePath: string | string[], options: {} }): Promise<void> {
        return new Promise(function (resolve, reject) {
            log({ message: `Running pack file wrapper`, color: white });
            const extractor: ZipStream = Seven.add(
                destinationPath,
                sourcePath,
                options
            );
            extractor.on('end', function () {
                resolve();
            });
            extractor.on('error', function (error) {
                reject(error);
            });
        });
    }

    /**
     * Unpack an archive path or a file buffer to a buffer 
     * 
     * @param params.archivePath (optional) Full archive path
     * @param params.buffer (optional) File buffer
     * @param params.password Archive password
     * @remarks
     * Use either path or buffer as input
     * @example
     * ```
     * unpackFile({ archivePath, buffer, password });
     * ```
     * @returns Unpacked file buffer
     * @since 0.0.1
     */
    export async function unpackFile({ archivePath, buffer, password }:
        { archivePath?: string, buffer?: Buffer, password: string }): Promise<Buffer> {

        if ((buffer && Buffer.isBuffer(buffer))) {
            const tempFilePath = tmp.tmpNameSync();
            await writeBinaryFile({ filePath: tempFilePath, buffer });
            archivePath = tempFilePath;
        }
        if (archivePath === undefined) archivePath = '';

        const extractionPath: string = `${archivePath}-extracted`;

        log({ message: `Unpacking file: ${archivePath}`, color: white });

        const options: {} = {
            $bin: SEVENZIPBIN_FILEPATH,
            password: password
        };
        await unpackFileWrapper({ archivePath, extractionPath, options });

        const extractedFilePath: string = await firstFilenameInFolder({ folderPath: extractionPath });
        const unpackedBuffer: Buffer = await readBinaryFile({ filePath: extractedFilePath });

        await deleteFile({ filePath: archivePath });
        await deleteFolder({ folderPath: extractionPath });

        return unpackedBuffer;
    }

    /**
     * Decompress a file using 7-zip
     * 
     * @param params.archivePath Full archive path
     * @param params.extractionPath Full extraction path
     * @param params.options Options object containing `$bin` with 7zip binary path and `password` containing archive password
     * @example
     * ```
     * unpackFileWrapper({ archivePath, extractionPath, options });
     * ```
     * @returns Nada
     * @since 0.0.1
     */
    export async function unpackFileWrapper({ archivePath, extractionPath, options }:
        { archivePath: string, extractionPath: string, options: {} }): Promise<void> {
        return new Promise(function (resolve, reject) {
            const extractor: ZipStream = Seven.extractFull(
                archivePath,
                extractionPath,
                options
            );
            extractor.on('end', function () {
                resolve();
            });
            extractor.on('error', function (error) {
                reject(error);
            });
        });
    }

    /**
     * Get packed filename
     * 
     * @param params.filePath Full file path
     * @example
     * ```
     * getPackedFilename({ filePath });
     * ```
     * @returns Packed filename
     * @since 0.0.1
     */
    export function getPackedFilename({ filePath }:
        { filePath: string }): string {
        const filenameWithoutExt: string = getFilenameWithoutExtension({ filePath });
        const packedFilename: string = `${filenameWithoutExt}${PACKFILEEXTENSION}`;
        return packedFilename;
    }

    /**
     * Get packed full file path, append pack file extension
     * 
     * @param params.filePath Full file path
     * @example
     * ```
     * getPackedPath({ filePath });
     * ```
     * @returns Packed file path
     * @since 0.0.1
     */
    export function getPackedPath({ filePath }:
        { filePath: string }): string {
        const packedPath: string = `${filePath}${PACKFILEEXTENSION}`;
        return packedPath;
    }

    /**
     * Get filename from path without extension
     * 
     * @param params.filePath Full file path
     * @example
     * ```
     * getFilenameWithoutExtension({ filePath });
     * ```
     * @returns Filename without file extension
     * @since 0.0.1
     */
    export function getFilenameWithoutExtension({ filePath }:
        { filePath: string }): string {
        const filenameWithoutExt: string = basename(filePath, extname(filePath));
        return filenameWithoutExt;
    }

    /**
     * Get filename from a full path
     * 
     * @param params.filePath Full file path
     * @example
     * ```
     * getFilename({ filePath });
     * ```
     * @returns Filename
     * @since 0.0.1
     */
    export function getFilename({ filePath }:
        { filePath: string }): string {
        const filename: string = basename(filePath);
        return filename;
    }
}

export default Packer;
