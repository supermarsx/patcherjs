import {
    ConfigurationObject
} from './configuration.types.js';

export namespace ConfigurationDefaults {
    /**
     * Get the default configuration object
     * 
     * @example
     * ```
     * getDefaultConfigurationObject();
     * ```
     * @returns Default configuration object
     * @since 0.0.1
     */
    export function getDefaultConfigurationObject(): ConfigurationObject {
        const defaultConfigurationObject: ConfigurationObject = {
            options: {
                general: {
                    exitOnNonAdmin: true,
                    debug: true,
                    logging: false,
                    runningOrder: [
                        "commands",
                        "filedrops",
                        "patches"
                    ],
                    commandsOrder: [
                        "tasks",
                        "services",
                        "kill",
                        "general"
                    ],
                    onlyPackingMode: false,
                    progressInterval: 0
                },
                patches: {
                    runPatches: true,
                    forcePatch: false,
                    fileSizeCheck: true,
                    fileSizeThreshold: 0,
                    skipWritePatch: false,
                    allowOffsetOverflow: false,
                    bigEndian: false,
                    failOnUnexpectedPreviousValue: false,
                    warnOnUnexpectedPreviousValue: true,
                    nullPatch: false,
                    unpatchMode: false,
                    verifyPatch: true,
                    backupFiles: true,
                    skipWritingBinary: false,
                    streamingParser: false,
                },
                commands: {
                    runCommands: true
                },
                filedrops: {
                    runFiledrops: true,
                    isFiledropPacked: true,
                    isFiledropCrypted: true,
                    backupFiles: true
                }
            },
            patches: [],
            commands: {
                tasks: [],
                kill: [],
                services: [],
                general: []
            },
            filedrops: []
        };

        return defaultConfigurationObject;
    }
}

export default ConfigurationDefaults;

