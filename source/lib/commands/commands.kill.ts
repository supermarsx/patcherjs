import Command from './command.js';
const { runCommand } = Command;

import Debug from '../auxiliary/debug.js';
const { log } = Debug;

import colorsCli from 'colors-cli';
const { red_bt, white } = colorsCli;

import {
    CommandKillObject,
    ConfigurationObject
} from '../configuration/configuration.types.js';

import Constants from '../configuration/constants.js';
const {
    TASKKILL_BIN
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
                log({ message: `Killing process ${kill.name}`, color: white });
                await runCommandsKillSingle({ kill });
            }
    }
    export const runAllKillCommands = runCommandsKill;
    export const runAllKills = runCommandsKill;

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
            log({ message: `Failed to process kill command ${error}`, color: red_bt });
        }
    }
    export const runSingleKillCommand = runCommandsKillSingle;
    export const runSingleKill = runCommandsKillSingle;

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
        const parameters: string = `/f /im \"${taskName}\"`;
        const result: string | null = await runCommand({ command, parameters });
        return result;
    }
    export const kill = killTask;
}

export default CommandsKill;