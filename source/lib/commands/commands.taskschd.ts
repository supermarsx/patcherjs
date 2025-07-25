import Command from './command.js';
const { runCommand } = Command;

import Logger from '../auxiliary/logger.js';
const { logInfo, logError } = Logger;

import {
    CommandTaskSchedulerObject,
    ConfigurationObject
} from '../configuration/configuration.types.js';

import Constants from '../configuration/constants.js';
const {
    COMM_TASKS_DELETE,
    COMM_TASKS_STOP,
    TASKSCHD_BIN,
    IS_WINDOWS,
    IS_MACOS
} = Constants;

export namespace CommandsTaskscheduler {
    /**
     * Run task scheduler related commands
     *
     * @param params.configuration Configuration object
     * @example
     * ```
     * runCommandsTaskScheduler({ configuration });
     * ```
     * @returns Nada
     * @since 0.0.1
     */
    export async function runCommandsTaskScheduler({ configuration }:
        { configuration: ConfigurationObject }): Promise<void> {
        const { tasks } = configuration.commands;
        for (const task of tasks)
            if (task.enabled === true) {
                logInfo(`Running task scheduler function ${task.command} to ${task.name}`);
                await runCommandsTaskSchedulerSingle({ task });
            }
    }

    /**
     * Run task scheduler command
     * 
     * @param params.task Command task scheduler object
     * @example
     * ```
     * runCommandsTaskSchedulerSingle({ task });
     * ```
     * @returns Nada
     * @since 0.0.1
     */
    export async function runCommandsTaskSchedulerSingle({ task }:
        { task: CommandTaskSchedulerObject }): Promise<void> {
        try {
            const functionName: string = task.command;
            const taskName: string = task.name;
            switch (functionName) {
                case COMM_TASKS_DELETE:
                    logInfo(`Deleting scheduled task ${taskName}`);
                    await remove({ taskName });
                    break;
                case COMM_TASKS_STOP:
                    logInfo(`Stopping scheduled task ${taskName}`);
                    await stop({ taskName });
                    break;
                default:
                    throw new Error(`Unknown task scheduler function: ${functionName}`);
            }

        } catch (error) {
            logError(`Failed to process task scheduler command ${error}`);
        }
    }

    /**
     * Remove a task using schtasks
     * 
     * @param params.taskName Task name
     * @example
     * ```
     * remove({ taskName });
     * ```
     * @returns
     * @since 0.0.1
     */
    export async function remove({ taskName }:
        { taskName: string }): Promise<string | null> {
        const command: string = TASKSCHD_BIN;
        const parameters: string[] = IS_WINDOWS
            ? ['/delete', '/f', '/tn', taskName]
            : IS_MACOS
                ? ['remove', taskName]
                : ['disable', '--now', taskName];
        const result: string | null = await runCommand({ command, parameters });
        return result;
    }

    /**
     * Stop a task using schtasks
     * 
     * @param params.taskName Task name
     * @example
     * ```
     * stop({ taskName });
     * ```
     * @returns
     * @since 0.0.1
     */
    export async function stop({ taskName }:
        { taskName: string }): Promise<string | null> {
        const command: string = TASKSCHD_BIN;
        const parameters: string[] = IS_WINDOWS
            ? ['/end', '/tn', taskName]
            : ['stop', taskName];
        const result: string | null = await runCommand({ command, parameters });
        return result;
    }
}

export default CommandsTaskscheduler;

