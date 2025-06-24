import { exit } from 'process';

import * as isElevated from 'elevated';

import Debug from './debug.js';
const { log } = Debug;

import colorsCli from 'colors-cli';
const { white, red_bt } = colorsCli;

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
            const isAdministrator: boolean = await isElevated.check();
            log({ message: `Is current user admin: ${isAdministrator}`, color: white });
            return isAdministrator;
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
            log({ message: `Exiting because user doesn't have administrator privileges'`, color: red_bt });
            exit(exitCode);
        }
    }
}

export default Uac;