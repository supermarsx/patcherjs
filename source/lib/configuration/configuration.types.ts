import type { CompositeName } from '../composites.types.js';

/**
 * Configuration object type, configuration read from `config.json` file
 */
export type ConfigurationObject = {
    options: {
        general: {
            exitOnNonAdmin: boolean,
            debug: boolean,
            logging: boolean,
            runningOrder: CompositeName[] | [],
            commandsOrder: string[] | [],
            onlyPackingMode: boolean,
            /** Interval for emitting progress messages during patching */
            progressInterval: number
        },
        patches: {
            runPatches: boolean,
            forcePatch: boolean,
            fileSizeCheck: boolean,
            fileSizeThreshold: number,
            skipWritePatch: boolean,
            /** Allow patching offsets past the end of the file */
            allowOffsetOverflow: boolean,
            /** Treat multi-byte values as big-endian */
            bigEndian: boolean,
            failOnUnexpectedPreviousValue: boolean,
            warnOnUnexpectedPreviousValue: boolean,
            nullPatch: boolean,
            unpatchMode: boolean,
            verifyPatch: boolean,
            backupFiles: boolean,
            skipWritingBinary: boolean,
            /** Use streaming parser for patch files */
            streamingParser: boolean,
        },
        commands: {
            runCommands: boolean
        },
        filedrops: {
            runFiledrops: boolean,
            isFiledropPacked: boolean,
            isFiledropCrypted: boolean,
            backupFiles: boolean
        }
    },
    patches: [
        {
            /** Patch name for display purposes */
            name: string, 
            /** Patch filename or path */
            patchFilename: string, 
            /** Filepath of the file to be patched */
            fileNamePath: string, 
            /** Is this patch enabled */
            enabled: boolean 
        }
    ] | [],
    commands: {
        tasks: [
            {
                name: string,
                command: string,
                enabled: boolean
            }
        ] | [],
        kill: [
            {
                name: string,
                enabled: boolean
            }
        ] | [],
        services: [
            {
                name: string,
                command: string,
                enabled: boolean
            }
        ] | [],
        general: [
            {
                name: string,
                command: string,
                enabled: boolean,
                timeout?: number,
                cwd?: string
            }
        ] | []
    },
    filedrops: [
        {
            name: string,
            fileDropName: string,
            packedFileName: string,
            fileNamePath: string,
            decryptKey: string,
            enabled: boolean
        }
    ] | []
};

type Options = `options`;

type Patches = `patches`;
type Commands = `commands`;
type Filedrops = `filedrops`;

type Tasks = `tasks`;
type Kill = `kill`;
type Services = `services`;
type General = `general`;

export type PatchOptionsObject = ConfigurationObject[Options][Patches];
export type CommandOptionsObject = ConfigurationObject[Options][Commands];
export type FiledropsOptionsObject = ConfigurationObject[Options][Filedrops];

/** Patch file object */
export type PatchFileObject = ConfigurationObject[Patches][number];

export type CommandTaskSchedulerObject = ConfigurationObject[Commands][Tasks][number];
export type CommandKillObject = ConfigurationObject[Commands][Kill][number];
export type CommandServicesObject = ConfigurationObject[Commands][Services][number];
export type CommandGeneralObject = ConfigurationObject[Commands][General][number];

export type FiledropsObject = ConfigurationObject[Filedrops][number];
