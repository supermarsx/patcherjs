import DebugWrappers from './debug.wrappers.js';
const { parseBoolean } = DebugWrappers;

export namespace EnvironmentDebug {
    /**
     * Get environment variable value
     * 
     * @param params.envVarName Variable name
     * @example
     * ```
     * getEnv({ envVarName });
     * ```
     * @returns Environment variable value
     * @since 0.0.1
     */
    export function getEnv({ envVarName }:
        { envVarName: string }): string {

        var envSanitizedValue: string = '';
        const envValue: string | undefined = process.env[envVarName];
        if (typeof envValue === 'string')
            envSanitizedValue = envValue;
        else
            envSanitizedValue = '';
        return envSanitizedValue;
    }
    export const getEnvironmentVariable = getEnv;

    /**
     * Set an environment variable
     * 
     * @param params.envVarName Environment variable name
     * @param params.varValue Value to set
     * @example
     * ```
     * setEnv({ envVarName, varValue });
     * ```
     * @returns Nada
     * @since 0.0.1
     */    
    export function setEnv({ envVarName, varValue }:
        { envVarName: string, varValue: string | any }): void {

        const finalVarValue: string = varValue.toString();
        process.env[envVarName] = finalVarValue;
    }
    export const setEnvironmentVariable = setEnv;

    /**
     * Get boolean value from an environment variable
     * 
     * @param params.envVarName Environment variable name 
     * @example
     * ```
     * getEnvBoolean({ envVarName });
     * ```
     * @returns `true` or `false`
     * @since 0.0.1
     */    
    export function getEnvBoolean({ envVarName }:
        { envVarName: string }): boolean {

        const envValue: string = getEnv({ envVarName });
        const booleanVarValue: boolean = parseBoolean({ value: envValue });
        return booleanVarValue;
    }
    export const getEnvironmentVariableBoolean = getEnvBoolean;
}

export default EnvironmentDebug;
