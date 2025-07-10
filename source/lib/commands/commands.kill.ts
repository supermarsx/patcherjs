import Command from './command.js';
const { runCommand } = Command;

import Logger from '../auxiliary/logger.js';
const { logInfo, logError } = Logger;

import {
    CommandKillObject,
    ConfigurationObject
} from '../configuration/configuration.types.js';

import Constants from '../configuration/constants.js';
const {
    TASKKILL_BIN,
    IS_WINDOWS
} = Constants;

export namespace CommandsKill {
    /**
     * Run all kill commands in configuration
     * 
     * @param params.configuration Configuration object
     * @example
     * ```
     * runCommandsKill({ configuration });
     * ```
     * @returns Nada
     * @since 0.0.1
     */
    export async function runCommandsKill({ configuration }:
        { configuration: ConfigurationObject }): Promise<void> {
        const killList = configuration.commands.kill;
        for (const kill of killList)
            if (kill.enabled === true) {
                logInfo(`Killing process ${kill.name}`);
                await runCommandsKillSingle({ kill });
            }
    }

    /**
     * Run a single kill command
     * 
     * @param params.kill Command kill object
     * @example
     * ```
     * runCommandsKillSingle({ kill });
     * ```
     * @returns Nada
     * @since 0.0.1
     */
    export async function runCommandsKillSingle({ kill }:
        { kill: CommandKillObject }): Promise<void> {
        try {
            const taskName: string = kill.name;
            await killTask({ taskName });
        } catch (error) {
            logError(`Failed to process kill command ${error}`);
        }
    }

    /**
     * Kill a specific task name
     * 
     * @param params.taskName Task name
     * @example
     * ```
     * killTask({ taskName });
     * ``` 
     * @returns
     * @since 0.0.1
     */
    export async function killTask({ taskName }:
        { taskName: string }): Promise<string | null> {

        const command: string = TASKKILL_BIN;
        const parameters: string[] = IS_WINDOWS
            ? ['/f', '/im', taskName]
            : ['-9', `$(pgrep -f \"${taskName}\")`];
        const result: string | null = await runCommand({ command, parameters });
        return result;
    }
}

export default CommandsKill;
