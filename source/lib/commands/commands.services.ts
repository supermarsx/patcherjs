import Command from './command.js';
const { runCommand } = Command;

import Logger from '../auxiliary/logger.js';
const { logInfo, logError } = Logger;

import {
    CommandServicesObject,
    ConfigurationObject
} from '../configuration/configuration.types.js';

import Constants from '../configuration/constants.js';
const {
    COMM_SERVICES_DISABLE,
    COMM_SERVICES_REMOVE,
    COMM_SERVICES_STOP,
    SERVICE_BIN,
    IS_WINDOWS,
    IS_MACOS
} = Constants;

export namespace CommandsServices {
    /**
     * Run all services commands
     * 
     * @param params.configuration Configuration object
     * @example
     * ```
     * runCommandsServices({ configuration });
     * ```
     * @returns Nada
     * @since 0.0.1
     */
    export async function runCommandsServices({ configuration }:
        { configuration: ConfigurationObject }): Promise<void> {

        const { services } = configuration.commands;
        for (const service of services)
            if (service.enabled === true) {
                logInfo(`Running services function ${service.command} to ${service.name}`);
                await runCommandsServicesSingle({ service });
            }
    }

    /*
        Run services related command
    */
    /**
     * Run a single service command
     * 
     * @param params.service Service command object
     * @example
     * ```
     * runCommandsServicesSingle({ service });
     * ```
     * @returns Nada
     * @since 0.0.1
     */
    export async function runCommandsServicesSingle({ service }:
        { service: CommandServicesObject }): Promise<void> {

        try {
            const functionName: string = service.command;
            const serviceName: string = service.name;
            switch (functionName) {
                case COMM_SERVICES_STOP:
                    logInfo(`Stopping service ${serviceName}`);
                    await stop({ serviceName });
                    break;
                case COMM_SERVICES_DISABLE:
                    logInfo(`Disabling service ${serviceName}`);
                    await disable({ serviceName });
                    break;
                case COMM_SERVICES_REMOVE:
                    logInfo(`Removing service ${serviceName}`);
                    await remove({ serviceName });
                    break;
                default:
                    throw new Error(`Unknown services command function: ${serviceName}`);
            }

        } catch (error) {
            logError(`Failed to process services command ${error}`);
        }
    }

    /**
     * Stop a service using sc
     * 
     * @param params.serviceName Service name
     * @example
     * ```
     * stop({ serviceName });
     * ```
     * @returns
     * @since 0.0.1
     */
    export async function stop({ serviceName }:
        { serviceName: string }): Promise<string | null> {

        const command: string = SERVICE_BIN;
        const parameters: string[] = IS_WINDOWS
            ? ['stop', serviceName]
            : ['stop', serviceName];
        const result: string | null = await runCommand({ command, parameters });
        return result;
    }

    /**
     * Disable a service using sc
     * 
     * @param params.serviceName Service name
     * @example
     * ```
     * disable({ serviceName });
     * ```
     * @returns
     * @since 0.0.1
     */
    export async function disable({ serviceName }:
        { serviceName: string }): Promise<string | null> {

        const command: string = SERVICE_BIN;
        const parameters: string[] = IS_WINDOWS
            ? ['config', serviceName, 'start=', 'disabled']
            : ['disable', serviceName];
        const result: string | null = await runCommand({ command, parameters });
        return result;
    }


    /**
     * Remove a service using sc 
     * 
     * @param params.serviceName
     * @example
     * ```
     * remove({ serviceName });
     * ```
     * @returns
     * @since 0.0.1
     */
    export async function remove({ serviceName }:
        { serviceName: string }): Promise<string | null> {

        const command: string = SERVICE_BIN;
        const parameters: string[] = IS_WINDOWS
            ? ['delete', serviceName]
            : IS_MACOS
                ? ['remove', serviceName]
                : ['disable', '--now', serviceName];
        const result: string | null = await runCommand({ command, parameters });
        return result;
    }
}

export default CommandsServices;

