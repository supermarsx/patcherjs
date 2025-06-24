import Env from './debug.env.js';
const { getEnvBoolean, setEnv } = Env;

import Logging from './debug.logging.js';

import { DebugStatus } from './debug.types.js';

import Constants from '../configuration/constants.js';
const {
    DEBUGGING,
    LOGGING
} = Constants;

export * from './debug.env.js';
export * from './debug.logging.js';
export * from './debug.types.js';
export * from './debug.wrappers.js';

export namespace Debug {

    export const log = Logging.log;
    export const logMessage = log;

    /**
     * Enable debug (and logging)
     * 
     * @param params.logging Enable logging
     * @example
     * ```
     * enable({ logging });
     * ```
     * @returns `true` on success or `false` on failure
     * @since 0.0.1
     */    
    export function enable({ logging = false }:
        { logging?: boolean }): boolean {
        try {
            setEnv({ envVarName: DEBUGGING, varValue: true });
            if (logging === true) setEnv({ envVarName: LOGGING, varValue: true });
            return true;
        } catch {
            return false;
        }
    }
    export const enableDebug = enable;

    /**
     * Disable debug (and logging)
     * 
     * @example
     * ```
     * disable();
     * ```
     * @returns `true`on success or `false` on failure
     * @since 0.0.1
     */    
    export function disable(): boolean {
        try {
            setEnv({ envVarName: DEBUGGING, varValue: false });
            return true;
        } catch {
            return false;
        }
    }
    export const disableDebug = disable;

    /**
     * Check if debugging is enabled
     * 
     * @example
     * ```
     * isEnabled();
     * ```
     * @returns Debug status object
     * @since 0.0.1 
     */    
    export function isEnabled(): DebugStatus {
        const isDebuggingEnabled: boolean = getEnvBoolean({ envVarName: DEBUGGING });
        const isLoggingEnabled: boolean = getEnvBoolean({ envVarName: LOGGING });
        const debugStatus: DebugStatus = {
            DEBUGGING: isDebuggingEnabled,
            LOGGING: isLoggingEnabled
        };
        return debugStatus;
    }
    export const isDebuggingEnabled = isEnabled;
    export const isDisabled = !isEnabled;
    export const isDebuggingDisabled = isDisabled;
}

export default Debug;