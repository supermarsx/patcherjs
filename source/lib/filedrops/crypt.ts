import { BinaryLike, createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync, CipherGCM } from 'crypto';

import File from '../auxiliary/file.js';
const { readBinaryFile } = File;

import Packer from './packer.js';
const { getFilename } = Packer;

import BufferWrappers from '../patches/buffer.wrappers.js';
const { createBuffer } = BufferWrappers;

import Debug from '../auxiliary/debug.js';
const { log } = Debug;

import colorsCli from 'colors-cli';
const { red_bt, white, yellow_bt } = colorsCli;

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
    CRYPTO_ENCODING,
    //CRYPTO_ENCODING_DECRYPT,
    //CRYPTO_PREFIX_ENCODING,
    //CRYPTO_PREFIX_BYTES,
    CRYPTO_BUFFER_SUBSETS
} = Constants;

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
            var fileData: Buffer | string;

            if (filePath && typeof filePath !== 'undefined' && typeof filePath === 'string') {
                const filename: string = getFilename({ filePath });
                log({ message: `Reading file to encrypt ${filename}`, color: white });
                fileData = await readBinaryFile({ filePath });
            } else {
                log({ message: `Reading buffer to encrypt`, color: white });
                if (buffer && typeof buffer !== 'undefined' && Buffer.isBuffer(buffer) === true) {
                    fileData = buffer;
                } else {
                    fileData = createBuffer({ size: 0 });
                    log({ message: `Encryption will probably fail because buffer is empty`, color: yellow_bt });
                }
            }

            fileData = fileData.toString(CRYPTO_ENCODING);

            const salt: Buffer = randomBytes(CRYPTO_SALT_RANDOMBYTES);
            const iv: BinaryLike = randomBytes(CRYPTO_IV_RANDOMBYTES);
            const algorithm: string = CRYPTO_ALG;
            const iterations: number = CRYPTO_ITERATIONS;
            const encryptionKey: Buffer = deriveKeyFromPassword({ password: key, salt: salt, iterations: iterations });

            // @ts-ignore
            const cipher: CipherGCM = createCipheriv(algorithm, encryptionKey, iv);

            log({ message: `Encrypting data`, color: white });

            const encryptedData: Buffer = Buffer.concat([
                Buffer.from(cipher.update(fileData, CRYPTO_ENCODING)),
                cipher.final()
            ]);

            const iterationsBuffer: Buffer = Buffer.from(iterations.toString());
            const authTag: Buffer = cipher.getAuthTag();
            const dataPrefix: Buffer = Buffer.from(getEncryptedPrefix());

            log({ message: `Generated salt: (${salt.byteLength}) ${salt.toString(`hex`)}`, color: white });
            log({ message: `Generated IV: (${iv.byteLength}) ${Buffer.from(iv).toString(`hex`)}`, color: white });
            log({ message: `AuthTag: (${authTag.byteLength}) ${authTag.toString(`hex`)}`, color: white });
            log({ message: `Detected iterations: ${iterations}`, color: white });

            log({ message: `Input key: ${key.slice(0, 4)}...${key.slice(-4)}`, color: white });
            log({ message: `Computed encryption key: ${encryptionKey.toString(`hex`).slice(0, 6)}...${encryptionKey.toString(`hex`).slice(-6)}`, color: white });

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
            log({ message: `There was an error encrypting: ${error}`, color: red_bt });
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
            var fileData: Buffer;

            if (filePath && typeof filePath !== 'undefined' && typeof filePath === 'string') {
                const filename: string = getFilename({ filePath });
                log({ message: `Reading file to decrypt ${filename}`, color: white });
                fileData = await readBinaryFile({ filePath });
            } else {
                log({ message: `Reading buffer to decrypt`, color: white });
                if (buffer && typeof buffer !== 'undefined' && Buffer.isBuffer(buffer) === true) {
                    fileData = buffer;
                } else {
                    fileData = createBuffer({ size: 0 });
                    log({ message: `Decryption will probably fail because buffer is empty`, color: yellow_bt });
                }
            }

            //log({ message: `${truncateBuffer(fileData).toString(`hex`)}`, color: white });


            const dataPrefix: string = getEncryptedPrefix();
            const bufferSubsets: CryptBufferSubsets = CRYPTO_BUFFER_SUBSETS;

            // const fileDataHexConverted: Buffer = Buffer.from(fileData.toString('hex'));

            const packedPrefixString: string = (getSlicedData({ data: fileData, subsetOptions: bufferSubsets.prefix })).toString();
            log({ message: `Detected pack prefix: ${packedPrefixString}`, color: white });

            if (dataPrefix !== packedPrefixString)
                throw new Error(`May have not be encrypted using patcher`);

            //const encryptedDataBuffer: Buffer = Buffer.from(truncateBuffer({ buffer: Buffer.from(encryptedData.toString(), CRYPTO_ENCODING) }).toString('hex'));

            const salt: Buffer = getSlicedData({ data: fileData, subsetOptions: bufferSubsets.salt });
            const iv: Buffer = getSlicedData({ data: fileData, subsetOptions: bufferSubsets.iv });
            const authTag: Buffer = getSlicedData({ data: fileData, subsetOptions: bufferSubsets.authTag });
            const algorithm: string = CRYPTO_ALG;
            const iterations: Buffer = getSlicedData({ data: fileData, subsetOptions: bufferSubsets.iterations });

            const iterationsInt = parseInt(iterations.toString(), 10);

            log({ message: `Detected salt: (${salt.byteLength}) ${salt.toString(`hex`)}`, color: white });
            log({ message: `Detected IV: (${iv.byteLength}) ${iv.toString(`hex`)}`, color: white });
            log({ message: `Detected authTag: (${authTag.byteLength}) ${authTag.toString(`hex`)}`, color: white });
            log({ message: `Detected iterations: ${iterationsInt}`, color: white });

            /*
            const test: Buffer = getSlicedData({ data: fileData, subsetOptions: { offset: 0, bytes: 110 } });
            const based: Buffer = getSlicedData({ data: test, subsetOptions: { offset: 0, bytes: 18 } });
            console.log(`test ${test}`);
            console.log(`based ${based}`);
            console.log(`salt length ` + salt.byteLength)
            console.log(`iv length ` + iv.byteLength)
            console.log(`iterations ` + iterationsInt);
            */

            const innerEncryptedData: Buffer = getSlicedData({ data: fileData, subsetOptions: bufferSubsets.innerEncryptedData });

            const decryptionKey: Buffer = deriveKeyFromPassword({ password: key, salt: salt, iterations: iterationsInt });

            log({ message: `Input key: ${key.slice(0, 4)}...${key.slice(-4)}`, color: white });
            log({ message: `Computed decryption key: ${decryptionKey.toString(`hex`).slice(0, 6)}...${decryptionKey.toString(`hex`).slice(-6)}`, color: white });

            log({ message: `Inner encrypted data length: ${innerEncryptedData.byteLength}`, color: white });

            // @ts-ignore
            const decipher: CipherGCM = createDecipheriv(algorithm, decryptionKey, iv);
            // @ts-ignore
            decipher.setAuthTag(authTag);

            log({ message: `Decrypting data`, color: white });
            const decryptedData: Buffer = Buffer.concat([
                decipher.update(innerEncryptedData),
                decipher.final()
            ]);

            return decryptedData;
        } catch (error) {
            log({ message: `There was an error decrypting: ${error}`, color: red_bt });
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
        log({ message: `reading offset at ${offset}, ${limit} bytes`, color: white });
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

/*
function hexToUtf8(hexString) {
    // Convert hexadecimal string to Uint8Array
    const byteArray = new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

    // Create a TextDecoder object with UTF-8 encoding
    const textDecoder = new TextDecoder('utf-8');

    // Decode Uint8Array to UTF-8 string
    const utf8String = textDecoder.decode(byteArray);

    return utf8String;
}
function binaryToHexPreserveLength(binaryString) {
    // Pad the binary string with leading zeros to ensure each character has 8 bits (1 byte)
    while (binaryString.length % 8 !== 0) {
        binaryString = '0' + binaryString;
    }

    // Convert binary string to hexadecimal string without doubling the length
    let hexString = '';
    for (let i = 0; i < binaryString.length; i += 4) {
        const nibble = binaryString.substr(i, 4);
        const hex = parseInt(nibble, 2).toString(16);
        hexString += hex;
    }

    return hexString;
}
*/
