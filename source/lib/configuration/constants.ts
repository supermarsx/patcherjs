import sevenBin from '7zip-bin';
import { Encoding, CipherGCMTypes } from 'crypto';
import { join, sep } from 'path';

import {
    CryptBufferSubsets
} from '../filedrops/crypt.types.js';

const { floor, random } = Math;

namespace Constants {
    /** Operating system checks */
    export const IS_WINDOWS: boolean = process.platform === 'win32';
    export const IS_MACOS: boolean = process.platform === 'darwin';
    export const IS_LINUX: boolean = process.platform === 'linux';
    export const IS_UBUNTU: boolean = IS_LINUX; // alias for backward compatibility

    /** Task scheduler application binary name */
    export const TASKSCHD_BIN: string = IS_WINDOWS
        ? `schtasks.exe`
        : IS_MACOS
            ? `launchctl`
            : `systemctl`;

    /** System services application binary name */
    export const SERVICE_BIN: string = IS_WINDOWS
        ? `sc.exe`
        : IS_MACOS
            ? `launchctl`
            : `systemctl`;

    /** Task kill binary name */
    export const TASKKILL_BIN: string = IS_WINDOWS ? `taskkill.exe` : `kill`;

    /** Debugging name environment variable names */
    /** Debugging env var name */
    export const DEBUGGING: string = `DEBUGGING`;
    /** Logging env var name */
    export const LOGGING: string = `LOGGING`;
    /** Logging file path env var name */
    export const LOGGING_FILEPATH: string = `LOGGING_FILEPATH`;

    // PACKER
    export const SEVENZIPBIN_FILEPATH: string = `${sevenBin.path7za}`;
    export const PACKFILEEXTENSION: string = `.pack`;
    export const PACKMETHOD: string[] = ['x=9'];

    // CRYPTO
    export const CRYPTO_ALG: CipherGCMTypes = `aes-256-gcm`;
    export const CRYPTO_IV_RANDOMBYTES: number = 16;
    export const CRYPTO_SALT_RANDOMBYTES: number = 64;
    export const CRYPTO_DIGEST: string = `sha512`;
    export const CRYPTO_KEYLENGTH: number = 32;
    const CRYPTO_LOWBOUND: number = 10000;
    const CRYPTO_HIGHBOUND: number = 99999;
    export const CRYPTO_ITERATIONS: number = floor(random() * (CRYPTO_HIGHBOUND - CRYPTO_LOWBOUND + 1)) + CRYPTO_LOWBOUND;
    export const CRYPTO_PREFIX: string = `ʞɔɐd::`;
    export const CRYPTO_PREFIX_BYTES: number = 9;
    export const CRYPTO_PREFIX_ENCODING: BufferEncoding = `utf-8`;
    export const CRYPTO_FORMAT: BufferEncoding = `hex`;
    export const CRYPTO_ENCODING: Encoding = `binary`;
    export const CRYPTO_ENCODING_DECRYPT: Encoding = `utf-8`;

    // CONFIG
    export const CONFIG_FILEPATH: string = `./config.json`;
    export const CONFIG_ENCODING: BufferEncoding = `utf-8`;

    // COMPOSITES
    export const COMPONENTS = {
        COMMANDS: `commands`,
        FILEDROPS: `filedrops`,
        PATCHES: `patches`
    } as const;

    // COMMAND TYPES
    export const COMMAND_TYPES = {
        TASKS: `tasks`,
        KILL: `kill`,
        SERVICES: `services`,
        GENERAL: `general`
    } as const;

    // PATCHES
    export const PATCHES_BACKUPEXT: string = `.bak`;
    export const PATCHES_BASEPATH: string = join('patch_files', sep);
    export const PATCHES_BASEUNPACKEDPATH: string = join('patch_files_unpacked', sep);
    /** Threshold for considering a file "large" when patching */
    export const LARGE_FILE_THRESHOLD: number = 0x80000000;


    // COMMANDS TASKSCHEDULER
    export const COMM_TASKS_DELETE: string = `delete`;
    export const COMM_TASKS_DEL: string = COMM_TASKS_DELETE;
    export const COMM_TASKS_REMOVE: string = COMM_TASKS_DELETE;
    export const COMM_TASKS_REM: string = COMM_TASKS_DELETE;
    export const COMM_TASKS_STOP: string = `stop`;

    // COMMANDS SERVICES
    export const COMM_SERVICES_STOP: string = `stop`;
    export const COMM_SERVICES_DISABLE: string = `disable`;
    export const COMM_SERVICES_REMOVE: string = `delete`;

    // CRYPTO BUFFER SUBSETS
    export const CRYPTO_BUFFER_SUBSETS: CryptBufferSubsets = {
        prefix: {
            offset: 0,
            bytes: CRYPTO_PREFIX_BYTES
        },
        salt: {
            offset: 0 + CRYPTO_PREFIX_BYTES,
            bytes: 64
        },
        iv: {
            offset: 64 + CRYPTO_PREFIX_BYTES,
            bytes: 16
        },
        authTag: {
            offset: 80 + CRYPTO_PREFIX_BYTES,
            bytes: 16
        },
        iterations: {
            offset: 96 + CRYPTO_PREFIX_BYTES,
            bytes: 5
        },
        innerEncryptedData: {
            offset: 101 + CRYPTO_PREFIX_BYTES
        }
    };
}

export type Component = typeof Constants.COMPONENTS[keyof typeof Constants.COMPONENTS];
export type CommandType = typeof Constants.COMMAND_TYPES[keyof typeof Constants.COMMAND_TYPES];

export default Constants;
