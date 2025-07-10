import CommandsTaskSchd from './commands.taskschd.js';
const { runCommandsTaskScheduler } = CommandsTaskSchd;

import CommandsServices from './commands.services.js';
const { runCommandsServices } = CommandsServices;

import CommandsKill from './commands.kill.js';
const { runCommandsKill } = CommandsKill;

import Command from './command.js';
const { runCommand } = Command;

import Logger from '../auxiliary/logger.js';
const { logInfo, logError } = Logger;

import {
    ConfigurationObject
} from '../configuration/configuration.types.js';

import Constants from '../configuration/constants.js';
const {
    COMM_GENERAL,
    COMM_KILL,
    COMM_SERVICES,
    COMM_TASKS
} = Constants;

export * from './command.js';
export * from './commands.additional.js';
export * from './commands.kill.js';
export * from './commands.services.js';
export * from './commands.taskschd.js';

export namespace Commands {
    /**
     * Run all commands
     * 
     * @param params.configuration Configuration object
     * @example
     * ```
     * runCommands({ configuration });
     * ```
     * @returns Nada
     * @since 0.0.1
     */
    export async function runCommands({ configuration }:
        { configuration: ConfigurationObject }): Promise<void> {
        const { runCommands } = configuration.options.commands;
        if (runCommands === false) {
            logInfo(`Skipping running commands due to configuration`);
            return;
        }

        const { commandsOrder } = configuration.options.general;

        for (const nextCommand of commandsOrder)
            await runCommandType({ configuration, functionName: nextCommand });
    }

    /**
     * Run command type (taskcheduler, services, kill or generic/general command)
     * 
     * @param params.configuration Configuration object
     * @param params.functionName Function name to run
     * @example
     * ```
     * runCommandType({ configuration, functionName });
     * ```
     * @returns Nada
     * @since 0.0.1
     */
    async function runCommandType({ configuration, functionName }:
        { configuration: ConfigurationObject, functionName: string }): Promise<void> {
        try {
            switch (functionName) {
                case COMM_TASKS:
                    await runCommandsTaskScheduler({ configuration });
                    break;
                case COMM_SERVICES:
                    await runCommandsServices({ configuration });
                    break;
                case COMM_KILL:
                    await runCommandsKill({ configuration });
                    break;
                case COMM_GENERAL:
                    await runCommandsGeneral({ configuration });
                    break;
                default:
                    throw new Error(`Unknown command type: ${functionName}`);
            }
        } catch (error) {
            logError(`Failed to process command type ${error}`);
        }
    }

    /**
     * Run general commands
     * 
     * @param params.configuration Configuration object
     * @example
     * ```
     * runCommandsGeneral({ configuration });
     * ```
     * @returns Nada
     * @since 0.0.1
     */
    export async function runCommandsGeneral({ configuration }:
        { configuration: ConfigurationObject }): Promise<void> {
        const commands = configuration.commands.general;
        for (const command of commands)
            if (command.enabled === true) {
                logInfo(`Running general command ${command.name}: ${command.command}`);
                await runCommand({ command: command.command, parameters: [] });
            }
    }
}

export default Commands;
