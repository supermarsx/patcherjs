import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

import Logger from '../auxiliary/logger.js';
const { logError } = Logger;

import { CommandError } from '../errors/index.js';

export namespace Command { 
    /**
     * Run a command
     * 
     * @param params.command Command to run
     * @param params.parameters Command parameters
     * @param [params.shell=false] Use a shell, pass true to enable (disabled by default for security)
     * @param [params.timeoutMs] Maximum time in milliseconds before the command is killed
     * @example
     * ```
     * // run a command with the default options (no shell, no timeout)
     * runCommand({ command, parameters });
     *
     * // explicitly enable shell usage
     * runCommand({ command, parameters, shell: true });
     *
     * // run with a timeout
     * runCommand({ command, parameters, timeoutMs: 1000 });
     * ```
     * @returns Command output or null on failure
     * @since 0.0.1
     */
    export async function runCommand({ command, parameters, shell = false, timeoutMs }:
        { command: string, parameters: string[], shell?: boolean, timeoutMs?: number }): Promise<string | null> {
        try {
            const result: string = await runCommandPromise({ command, parameters, shell, timeoutMs });
            return result;
        } catch (error) {
            if (error && typeof error === 'object') {
                if (String(error).length > 2) {
                    const errorMessage: string = String(error).replace(/\r?\n/g, '');
                    logError(`There was an error running a command: ${errorMessage}`);
                }
            }
            return null;
        }
    }

    /**
     * Runs a command with given parameters on a promise (exec wrapper)
     * 
     * @param params.command Command to run
     * @param params.parameters Command parameters
     * @param [params.shell=false] Use a shell, pass true to enable
     * @param [params.timeoutMs] Maximum time in milliseconds before the command is killed
     * @example
     * ```
     * // run without a shell and with a timeout
     * runCommandPromise({ command, parameters, timeoutMs: 5000 });
     * ```
     * @returns Command output 
     * @since 0.0.1
     */
    export async function runCommandPromise({ command, parameters, shell = false, timeoutMs }:
        { command: string, parameters: string[], shell?: boolean, timeoutMs?: number }): Promise<string> {

        return new Promise(function (resolve, reject) {
            const childProcess: ChildProcessWithoutNullStreams = spawn(command, parameters, { shell });
            let timedOut = false;
            let timer: NodeJS.Timeout | undefined;
            if (timeoutMs !== undefined) {
                timer = setTimeout(() => {
                    timedOut = true;
                    childProcess.kill();
                    reject(new CommandError(`Command timed out after ${timeoutMs}ms`));
                }, timeoutMs);
            }

            childProcess.on('error', (err) => {
                if (timer)
                    clearTimeout(timer);
                reject(err);
            });

            let output: string = '';
            childProcess.stdout.on('data', function (data) {
                output += data.toString();
            });
            childProcess.stderr.on('data', function (data) {
                output += data.toString();
            });
            childProcess.on('close', function (exitCode) {
                if (timer)
                    clearTimeout(timer);
                if (timedOut)
                    return;
                if (exitCode === 0)
                    resolve(output);
                else
                    reject(new CommandError(`Command exited with code ${exitCode} and output: ${output}`));
            });
        });
    }
}

export default Command;
