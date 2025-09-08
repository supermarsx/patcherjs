import File from '../auxiliary/file.js';
const { createReadStream, createWriteStream } = File;

import * as fs from 'fs/promises';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import { createGzip } from 'zlib';
import { createCipheriv, randomBytes, pbkdf2Sync, CipherGCM } from 'crypto';
import { EventEmitter } from 'events';

import Logger from '../auxiliary/logger.js';
const { logInfo, logSuccess, logError } = Logger;
import { join } from 'path';

import {
    ConfigurationObject,
    FiledropsObject,
    FiledropsOptionsObject
} from '../configuration/configuration.types.js';

import Constants from '../configuration/constants.js';
const {
    PATCHES_BASEPATH,
    PATCHES_BASEUNPACKEDPATH,
    CRYPTO_ALG,
    CRYPTO_IV_RANDOMBYTES,
    CRYPTO_SALT_RANDOMBYTES,
    CRYPTO_DIGEST,
    CRYPTO_KEYLENGTH,
    CRYPTO_ITERATIONS,
    CRYPTO_PREFIX
} = Constants;

/**
 * Emits events for packaging operations.
 *
 * Events:
 * - `start` &mdash; before a file is packed with `{ filedrop: FiledropsObject }`.
 * - `success` &mdash; after a file is packed with `{ filedrop: FiledropsObject, destinationPath: string }`.
 * - `error` &mdash; when an error occurs with `{ filedrop: FiledropsObject, error: unknown }`.
 */
export const packagingEmitter = new EventEmitter();

export namespace Packaging {
    /**
     * @internal
     * Run a collection of filedrops from a configuration file 
     * 
     * @param params.configuration Read configuration file from `config.json`
     * @example
     * ```
     * runPackings({ configuration });
     * ```
     * @returns Nada
     * @since 0.0.1
     */
    export async function runPackings({ configuration }:
        { configuration: ConfigurationObject }): Promise<void> {
        logInfo(`Running packing mode`);
        const { runFiledrops } = configuration.options.filedrops;
        if (runFiledrops === false) {
            logInfo(`Skipping packing due to runFiledrops configuration`);
            return;
        }

        const { filedrops } = configuration;
        const promises = filedrops
            .filter(filedrop => filedrop.enabled)
            .map(filedrop =>
                runPacking({ configuration, filedrop }).catch(error => {
                    logError(`There was an error packing a file: ${error}`);
                })
            );
        await Promise.all(promises);
    }

    /**
     * Run a single packing routine where a filedrop is packed (compressed) and encrypted using AES-256
     * 
     * @param params.configuration Configuration read from `config.json`
     * @param params.filedrop A specific filedrop object from the filedrops array read from configuration
     * @example
     * ```
     * runPacking({ configuration, filedrop });
     * ``` 
     * @returns nada
     * @since 0.0.1
     */
    async function runPacking({ configuration, filedrop }:
        { configuration: ConfigurationObject, filedrop: FiledropsObject }): Promise<void> {
        packagingEmitter.emit('start', { filedrop });
        try {
            logInfo(`Packing file ${filedrop.fileNamePath}`);
            const filedropOptions: FiledropsOptionsObject = configuration.options.filedrops;

            const { isFiledropPacked, isFiledropCrypted } = filedropOptions;
            const sourcePath: string = join(PATCHES_BASEUNPACKEDPATH, filedrop.packedFileName);
            const destinationPath: string = join(PATCHES_BASEPATH, filedrop.fileDropName);

            const readStream = createReadStream({ filePath: sourcePath });
            const transformStreams: Transform[] = [];

            if (isFiledropPacked === true)
                transformStreams.push(createGzip());

            if (isFiledropCrypted === true) {
                const salt: Buffer = randomBytes(CRYPTO_SALT_RANDOMBYTES);
                const iv: Buffer = randomBytes(CRYPTO_IV_RANDOMBYTES);
                const key: Buffer = pbkdf2Sync(filedrop.decryptKey, salt, CRYPTO_ITERATIONS, CRYPTO_KEYLENGTH, CRYPTO_DIGEST);
                const cipher: CipherGCM = createCipheriv(CRYPTO_ALG, key, iv);

                const writeStream = createWriteStream({ filePath: destinationPath });
                const prefix: Buffer = Buffer.from(CRYPTO_PREFIX);
                const iterationsBuffer: Buffer = Buffer.from(CRYPTO_ITERATIONS.toString());
                const header: Buffer = Buffer.concat([prefix, salt, iv, Buffer.alloc(16), iterationsBuffer]);
                writeStream.write(header);

                await pipeline([readStream, ...transformStreams, cipher, writeStream]);

                const authTagOffset: number = prefix.length + salt.length + iv.length;
                const authTag: Buffer = cipher.getAuthTag();
                const handle = await fs.open(destinationPath, 'r+');
                try {
                    await handle.write(authTag, 0, authTag.length, authTagOffset);
                } finally {
                    await handle.close();
                }
            } else {
                const writeStream = createWriteStream({ filePath: destinationPath });
                await pipeline([readStream, ...transformStreams, writeStream]);
            }

            logSuccess(`File was packed successfully`);
            packagingEmitter.emit('success', { filedrop, destinationPath });
        } catch (error) {
            packagingEmitter.emit('error', { filedrop, error });
            throw error;
        }
    }
}

export default Packaging;

