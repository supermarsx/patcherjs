import { exit } from 'process';

import * as isElevated from 'elevated';

import Logger from './logger.js';
const { logInfo, logError } = Logger;

export namespace Uac {
    /**
     * @internal
     * Checks if user has administrative execution rights
     * 
     * @example 
     * ```
     * isAdmin();
     * ```
     * @returns `true` when user is administrator, `false` when it's not or there was an error evaluating 
     * @since 0.0.1
     */
    export async function isAdmin(): Promise<boolean> {
        try {
            if (process.platform === 'win32') {
                const isAdministrator: boolean = await isElevated.check();
                logInfo(`Is current user admin: ${isAdministrator}`);
                return isAdministrator;
            }

            if (typeof process.getuid === 'function') {
                const isAdministrator: boolean = process.getuid() === 0;
                logInfo(`Is current user admin: ${isAdministrator}`);
                return isAdministrator;
            }

            logInfo('Is current user admin: false');
            return false;
        } catch {
            return false;
        }
    }

    /**
     * @internal
     * Checks for administrative execution rights and exits program execution with code 1 when user is not administrator
     * 
     * @example
     * ```
     * adminCheck();
     * ```
     * @returns Nada
     * @since 0.0.1
     */
    export async function adminCheck(): Promise<void> {
        const isAdministrator: boolean = await isAdmin();
        const exitCode: number = 1;
        if (!isAdministrator) {
            logError(`Exiting because user doesn't have administrator privileges`);
            exit(exitCode);
        }
    }
}

export default Uac;
