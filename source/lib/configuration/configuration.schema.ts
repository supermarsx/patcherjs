import Constants from './constants.js';
const { COMPONENTS, COMMAND_TYPES } = Constants;

export const configurationSchema = {
    type: 'object',
    properties: {
        options: {
            type: 'object',
            properties: {
                general: {
                    type: 'object',
                    properties: {
                        exitOnNonAdmin: { type: 'boolean' },
                        debug: { type: 'boolean' },
                        logging: { type: 'boolean' },
                        runningOrder: { type: 'array', items: { type: 'string', enum: Object.values(COMPONENTS) } },
                        commandsOrder: { type: 'array', items: { type: 'string', enum: Object.values(COMMAND_TYPES) } },
                        onlyPackingMode: { type: 'boolean' }
                    },
                    additionalProperties: true
                },
                patches: {
                    type: 'object',
                    properties: {
                        runPatches: { type: 'boolean' },
                        forcePatch: { type: 'boolean' },
                        fileSizeCheck: { type: 'boolean' },
                        fileSizeThreshold: { type: 'number' },
                        skipWritePatch: { type: 'boolean' },
                        allowOffsetOverflow: { type: 'boolean' },
                        bigEndian: { type: 'boolean' },
                        failOnUnexpectedPreviousValue: { type: 'boolean' },
                        warnOnUnexpectedPreviousValue: { type: 'boolean' },
                        nullPatch: { type: 'boolean' },
                        unpatchMode: { type: 'boolean' },
                        verifyPatch: { type: 'boolean' },
                        backupFiles: { type: 'boolean' },
                        skipWritingBinary: { type: 'boolean' },
                        streamingParser: { type: 'boolean' }
                    },
                    additionalProperties: true
                },
                commands: {
                    type: 'object',
                    properties: {
                        runCommands: { type: 'boolean' }
                    },
                    additionalProperties: true
                },
                filedrops: {
                    type: 'object',
                    properties: {
                        runFiledrops: { type: 'boolean' },
                        isFiledropPacked: { type: 'boolean' },
                        isFiledropCrypted: { type: 'boolean' },
                        backupFiles: { type: 'boolean' }
                    },
                    additionalProperties: true
                }
            },
            additionalProperties: true
        },
        patches: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    patchFilename: { type: 'string' },
                    fileNamePath: { type: 'string' },
                    enabled: { type: 'boolean' }
                },
                required: ['name', 'patchFilename', 'fileNamePath', 'enabled'],
                additionalProperties: true
            }
        },
        commands: {
            type: 'object',
            properties: {
                tasks: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            command: { type: 'string' },
                            enabled: { type: 'boolean' }
                        },
                        required: ['name', 'command', 'enabled'],
                        additionalProperties: true
                    }
                },
                kill: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            enabled: { type: 'boolean' }
                        },
                        required: ['name', 'enabled'],
                        additionalProperties: true
                    }
                },
                services: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            command: { type: 'string' },
                            enabled: { type: 'boolean' }
                        },
                        required: ['name', 'command', 'enabled'],
                        additionalProperties: true
                    }
                },
                general: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            command: { type: 'string' },
                            enabled: { type: 'boolean' },
                            timeout: { type: 'number' },
                            cwd: { type: 'string' }
                        },
                        required: ['name', 'command', 'enabled'],
                        additionalProperties: true
                    }
                }
            },
            additionalProperties: true
        },
        filedrops: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    fileDropName: { type: 'string' },
                    packedFileName: { type: 'string' },
                    fileNamePath: { type: 'string' },
                    decryptKey: { type: 'string' },
                    enabled: { type: 'boolean' }
                },
                required: ['name', 'fileDropName', 'packedFileName', 'fileNamePath', 'decryptKey', 'enabled'],
                additionalProperties: true
            }
        }
    },
    additionalProperties: true
} as const;

export default configurationSchema;

