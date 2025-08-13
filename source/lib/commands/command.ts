import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

import Logger from '../auxiliary/logger.js';
const { logError } = Logger;

import { CommandError } from '../errors/index.js';

export interface CommandResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}

export namespace Command {
    /**
     * Run a command
     * 
     * @param params.command Command to run
     * @param params.parameters Command parameters
     * @param [params.shell=false] Use a shell, pass true to enable (disabled by default for security)
     * @param [params.timeout] Maximum time in milliseconds before the command is killed
     * @param [params.maxBuffer] Maximum size in bytes for each output stream before truncation
     * @example
     * ```
     * // run a command with the default options (no shell, no timeout)
     * runCommand({ command, parameters });
     *
     * // explicitly enable shell usage
     * runCommand({ command, parameters, shell: true });
     *
     * // run with a timeout
     * runCommand({ command, parameters, timeout: 1000 });
     * ```
     * @returns Command output
     * @since 0.0.1
     */
    export async function runCommand({ command, parameters, shell = false, timeout, maxBuffer, cwd }:
        { command: string, parameters: string[], shell?: boolean, timeout?: number, maxBuffer?: number, cwd?: string }): Promise<CommandResult> {
        try {
            const result = await runCommandPromise({ command, parameters, shell, timeout, maxBuffer, cwd });
            return result;
        } catch (error) {
            if (error instanceof CommandError) {
                const errorMessage: string = String(error.message).replace(/\r?\n/g, '');
                logError(`There was an error running a command: ${errorMessage}`);
                throw error;
            }
            if (error && typeof error === 'object') {
                const errorMessage: string = String(error).replace(/\r?\n/g, '');
                logError(`There was an error running a command: ${errorMessage}`);
                throw new CommandError(errorMessage);
            }
            throw new CommandError('Unknown error running command');
        }
    }

    /**
     * Runs a command with given parameters on a promise (exec wrapper)
     * 
     * @param params.command Command to run
     * @param params.parameters Command parameters
     * @param [params.shell=false] Use a shell, pass true to enable
     * @param [params.timeout] Maximum time in milliseconds before the command is killed
     * @param [params.maxBuffer] Maximum size in bytes for each output stream before truncation
     * @example
     * ```
     * // run without a shell and with a timeout
     * runCommandPromise({ command, parameters, timeout: 5000 });
     * ```
     * @returns Command output 
     * @since 0.0.1
     */
    export async function runCommandPromise({ command, parameters, shell = false, timeout, maxBuffer, cwd }:
        { command: string, parameters: string[], shell?: boolean, timeout?: number, maxBuffer?: number, cwd?: string }): Promise<CommandResult> {

        return new Promise(function (resolve, reject) {
            const childProcess: ChildProcessWithoutNullStreams = spawn(command, parameters, { shell, cwd });
            const limit = maxBuffer ?? 1024 * 1024; // default 1MB per stream
            let timedOut = false;
            let timer: NodeJS.Timeout | undefined;
            if (timeout !== undefined) {
                timer = setTimeout(() => {
                    timedOut = true;
                    childProcess.kill();
                    reject(new CommandError(`Command timed out after ${timeout}ms`, { stdout, stderr, exitCode: null }));
                }, timeout);
            }

            let stdout = '';
            let stderr = '';

            childProcess.on('error', (err) => {
                if (timer)
                    clearTimeout(timer);
                const message = err instanceof Error ? err.message : String(err);
                reject(new CommandError(message, { stdout, stderr, exitCode: null }));
            });

            childProcess.stdout.on('data', function (data) {
                if (stdout.length < limit) {
                    const chunk = data.toString();
                    const remaining = limit - stdout.length;
                    stdout += chunk.slice(0, remaining);
                }
            });

            childProcess.stderr.on('data', function (data) {
                if (stderr.length < limit) {
                    const chunk = data.toString();
                    const remaining = limit - stderr.length;
                    stderr += chunk.slice(0, remaining);
                }
            });

            childProcess.on('close', function (exitCode) {
                if (timer)
                    clearTimeout(timer);
                if (timedOut)
                    return;
                if (exitCode === 0) {
                    resolve({ stdout, stderr, exitCode });
                } else {
                    reject(new CommandError(`Command exited with code ${exitCode}`, { stdout, stderr, exitCode }));
                }
            });
        });
    }
}

export default Command;
