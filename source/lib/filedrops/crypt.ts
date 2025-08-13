import { BinaryLike, createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync, CipherGCM, DecipherGCM, CipherGCMTypes } from 'crypto';

import File from '../auxiliary/file.js';
const { readBinaryFile } = File;

import Packer from './packer.js';
const { getFilename } = Packer;

import BufferWrappers from '../patches/buffer.wrappers.js';
const { createBuffer } = BufferWrappers;

import Logger from '../auxiliary/logger.js';
const { logInfo, logWarn, logError } = Logger;

import {
    CryptBufferSubsets,
    SubsetOptionsObject
} from './crypt.types.js';

import Constants from '../configuration/constants.js';
const {
    CRYPTO_ALG,
    CRYPTO_IV_RANDOMBYTES,
    CRYPTO_SALT_RANDOMBYTES,
    CRYPTO_ITERATIONS,
    CRYPTO_DIGEST,
    CRYPTO_KEYLENGTH,
    CRYPTO_PREFIX,
    //CRYPTO_FORMAT,
    //CRYPTO_ENCODING_DECRYPT,
    //CRYPTO_PREFIX_ENCODING,
    //CRYPTO_PREFIX_BYTES,
    CRYPTO_BUFFER_SUBSETS
} = Constants;

const DEBUG_KEY_LOGGING: boolean = process.env.DEBUG_KEY_LOGGING === 'true';

export * from './crypt.types.js';

export namespace Encryption {

    /**
     * Encrypt a file or buffer with a key
     * 
     * @param params.filePath File path of file to encrypt
     * @param params.buffer Buffer to encrypt if not using a path
     * @param params.key Password
     * @example
     * ``` 
     * encryptFile({ buffer, key });
     * ```
     * @returns Encrypted buffer or empty buffer on failure
     * @since 0.0.1
     */
    export async function encryptFile({ filePath, buffer, key }:
        { filePath?: string | undefined, buffer?: Buffer | undefined, key: string }): Promise<Buffer> {

        try {
            let fileData: Buffer;

            if (filePath && typeof filePath !== 'undefined' && typeof filePath === 'string') {
                const filename: string = getFilename({ filePath });
                logInfo(`Reading file to encrypt ${filename}`);
                fileData = await readBinaryFile({ filePath });
            } else {
                logInfo(`Reading buffer to encrypt`);
                if (buffer && typeof buffer !== 'undefined' && Buffer.isBuffer(buffer) === true) {
                    fileData = buffer;
                } else {
                    fileData = createBuffer({ size: 0 });
                    logWarn(`Encryption will probably fail because buffer is empty`);
                }
            }

            const salt: Buffer = randomBytes(CRYPTO_SALT_RANDOMBYTES);
            const iv: BinaryLike = randomBytes(CRYPTO_IV_RANDOMBYTES);
            const algorithm: CipherGCMTypes = CRYPTO_ALG;
            const iterations: number = CRYPTO_ITERATIONS;
            const encryptionKey: Buffer = deriveKeyFromPassword({ password: key, salt: salt, iterations: iterations });

            const cipher: CipherGCM = createCipheriv(algorithm, encryptionKey, iv);

            logInfo(`Encrypting data`);

            const encryptedData: Buffer = Buffer.concat([
                cipher.update(fileData),
                cipher.final()
            ]);

            const iterationsBuffer: Buffer = Buffer.from(iterations.toString());
            const authTag: Buffer = cipher.getAuthTag();
            const dataPrefix: Buffer = Buffer.from(getEncryptedPrefix());

            logInfo(`Generated salt: (${salt.byteLength}) ${salt.toString(`hex`)}`);
            logInfo(`Generated IV: (${iv.byteLength}) ${Buffer.from(iv).toString(`hex`)}`);
            logInfo(`AuthTag: (${authTag.byteLength}) ${authTag.toString(`hex`)}`);
            logInfo(`Detected iterations: ${iterations}`);

            if (DEBUG_KEY_LOGGING) {
                logInfo(`Input key: ${key.slice(0, 4)}...${key.slice(-4)}`);
                logInfo(`Computed encryption key: ${encryptionKey.toString(`hex`).slice(0, 6)}...${encryptionKey.toString(`hex`).slice(-6)}`);
            } else {
                logInfo(`Encryption key derived`);
            }

            const outputDataBuffer: Buffer = Buffer.concat([
                dataPrefix,
                salt,
                iv,
                authTag,
                iterationsBuffer,
                encryptedData
            ]);

            return outputDataBuffer;
        } catch (error) {
            logError(`There was an error encrypting: ${error}`);
            return createBuffer({ size: 0 });
        }
    }

    /**
     * Decrypt a file or buffer with a key
     * 
     * @param params.filePath File path of the file to decrypt
     * @param params.buffer Buffer to decrypt if not using a path
     * @param params.key Password
     * @example
     * ```
     * decryptFile({ buffer, key });
     * ```
     * @returns Decrypted buffer or an empty buffer on failure
     * @since 0.0.1
     */
    export async function decryptFile({ filePath, buffer, key }:
        { filePath?: string | undefined, buffer?: Buffer | undefined, key: string }): Promise<Buffer> {
        try {
            let fileData: Buffer;

            if (filePath && typeof filePath !== 'undefined' && typeof filePath === 'string') {
                const filename: string = getFilename({ filePath });
                logInfo(`Reading file to decrypt ${filename}`);
                fileData = await readBinaryFile({ filePath });
            } else {
                logInfo(`Reading buffer to decrypt`);
                if (buffer && typeof buffer !== 'undefined' && Buffer.isBuffer(buffer) === true) {
                    fileData = buffer;
                } else {
                    fileData = createBuffer({ size: 0 });
                    logWarn(`Decryption will probably fail because buffer is empty`);
                }
            }

            //log({ message: `${truncateBuffer(fileData).toString(`hex`)}`, color: white });


            const dataPrefix: string = getEncryptedPrefix();
            const bufferSubsets: CryptBufferSubsets = CRYPTO_BUFFER_SUBSETS;

            // const fileDataHexConverted: Buffer = Buffer.from(fileData.toString('hex'));

            const packedPrefixString: string = (getSlicedData({ data: fileData, subsetOptions: bufferSubsets.prefix })).toString();
            logInfo(`Detected pack prefix: ${packedPrefixString}`);

            if (dataPrefix !== packedPrefixString)
                throw new Error(`May have not be encrypted using patcher`);

            //const encryptedDataBuffer: Buffer = Buffer.from(truncateBuffer({ buffer: Buffer.from(encryptedData.toString(), CRYPTO_ENCODING) }).toString('hex'));

            const salt: Buffer = getSlicedData({ data: fileData, subsetOptions: bufferSubsets.salt });
            const iv: Buffer = getSlicedData({ data: fileData, subsetOptions: bufferSubsets.iv });
            const authTag: Buffer = getSlicedData({ data: fileData, subsetOptions: bufferSubsets.authTag });
            const algorithm: CipherGCMTypes = CRYPTO_ALG;
            const iterations: Buffer = getSlicedData({ data: fileData, subsetOptions: bufferSubsets.iterations });

            const iterationsInt = parseInt(iterations.toString(), 10);

            logInfo(`Detected salt: (${salt.byteLength}) ${salt.toString(`hex`)}`);
            logInfo(`Detected IV: (${iv.byteLength}) ${iv.toString(`hex`)}`);
            logInfo(`Detected authTag: (${authTag.byteLength}) ${authTag.toString(`hex`)}`);
            logInfo(`Detected iterations: ${iterationsInt}`);

            const innerEncryptedData: Buffer = getSlicedData({ data: fileData, subsetOptions: bufferSubsets.innerEncryptedData });

            const decryptionKey: Buffer = deriveKeyFromPassword({ password: key, salt: salt, iterations: iterationsInt });

            if (DEBUG_KEY_LOGGING) {
                logInfo(`Input key: ${key.slice(0, 4)}...${key.slice(-4)}`);
                logInfo(`Computed decryption key: ${decryptionKey.toString(`hex`).slice(0, 6)}...${decryptionKey.toString(`hex`).slice(-6)}`);
            } else {
                logInfo(`Decryption key derived`);
            }

            logInfo(`Inner encrypted data length: ${innerEncryptedData.byteLength}`);

            const decipher: DecipherGCM = createDecipheriv(algorithm, decryptionKey, iv);
            decipher.setAuthTag(authTag);

            logInfo(`Decrypting data`);
            const decryptedData: Buffer = Buffer.concat([
                decipher.update(innerEncryptedData),
                decipher.final()
            ]);

            return decryptedData;
        } catch (error) {
            logError(`There was an error decrypting: ${error}`);
            return createBuffer({ size: 0 });
        }
    }

    /**
     * Get sliced data from buffer
     * 
     * @param params.data Buffer to slice data from
     * @param params.subsetOptions Object containing offset and bytes to slice after 
     * @example
     * ```
     * getSlicedData({ data, subsetOptions });
     * ```
     * @returns Buffer containing the sliced data
     * @since 0.0.1
     */
    function getSlicedData({ data, subsetOptions }:
        { data: Buffer, subsetOptions: SubsetOptionsObject }): Buffer {
        const { offset, bytes } = subsetOptions;
        const sanitizedBytes: number = parseInt(bytes ? bytes.toString() : data.byteLength.toString());
        const limit: number = Math.min(offset + sanitizedBytes, data.length);
        logInfo(`reading offset at ${offset}, ${limit} bytes`);
        if (offset >= data.length)
            throw new Error(`Offset sliced data out of range, it can happen if file is invalid or corrupted`);
        return data.subarray(offset, limit);
    }

    /**
     * Get encryption string prefix
     * 
     * @example
     * ```
     * getEncryptedPrefix();
     * ```
     * @returns Crypto prefix
     * @since 0.0.1
     */
    function getEncryptedPrefix(): string {
        return CRYPTO_PREFIX;
    }

    /**
     * Derive key from a given password
     * 
     * @param params.password Password
     * @param params.salt Salt
     * @param params.iterations Number of iterations
     * @returns Buffer containing derived key
     * @since 0.0.1
     */
    function deriveKeyFromPassword({ password, salt, iterations }:
        { password: string, salt: Buffer, iterations: number }): Buffer {
        return pbkdf2Sync(password, salt, iterations, CRYPTO_KEYLENGTH, CRYPTO_DIGEST);
    }
}

export default Encryption;
