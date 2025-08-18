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

import Constants, { type CommandType } from '../configuration/constants.js';
const {
    COMMAND_TYPES
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
    const commandMap: Record<CommandType, (p: { configuration: ConfigurationObject }) => Promise<void>> = {
        [COMMAND_TYPES.TASKS]: runCommandsTaskScheduler,
        [COMMAND_TYPES.SERVICES]: runCommandsServices,
        [COMMAND_TYPES.KILL]: runCommandsKill,
        [COMMAND_TYPES.GENERAL]: runCommandsGeneral
    };

    async function runCommandType({ configuration, functionName }:
        { configuration: ConfigurationObject, functionName: CommandType }): Promise<void> {
        try {
            const fn = commandMap[functionName];
            if (!fn)
                throw new Error(`Unknown command type: ${functionName}`);
            await fn({ configuration });
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
                const DEFAULT_TIMEOUT = 60_000; // 60 seconds
                const timeout = command.timeout ?? DEFAULT_TIMEOUT;
                const { stdout, stderr, exitCode } = await runCommand({
                    command: command.command,
                    parameters: [],
                    timeout,
                    cwd: command.cwd
                });
                if (stdout)
                    logInfo(stdout);
                if (stderr)
                    logError(stderr);
                logInfo(`Command exited with code ${exitCode}`);
            }
    }
}

export default Commands;
