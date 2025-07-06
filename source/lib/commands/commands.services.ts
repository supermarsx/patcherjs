import Command from './command.js';
const { runCommand } = Command;

import Debug from '../auxiliary/debug.js';
const { log } = Debug;

import colorsCli from 'colors-cli';
const { red_bt, white } = colorsCli;

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
                log({ message: `Running services function ${service.command} to ${service.name}`, color: white });
                await runCommandsServicesSingle({ service });
            }
    }
    export const runAllServicesCommands = runCommandsServices;
    export const runAllServices = runCommandsServices;
    export const runAllSvs = runCommandsServices;

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
                    log({ message: `Stopping service ${serviceName}`, color: white });
                    await stop({ serviceName });
                    break;
                case COMM_SERVICES_DISABLE:
                    log({ message: `Disabling service ${serviceName}`, color: white });
                    await disable({ serviceName });
                    break;
                case COMM_SERVICES_REMOVE:
                    log({ message: `Removing service ${serviceName}`, color: white });
                    await remove({ serviceName });
                    break;
                default:
                    throw new Error(`Unknown services command function: ${serviceName}`);
            }

        } catch (error) {
            log({ message: `Failed to process services command ${error}`, color: red_bt });
        }
    }
    export const runSingleServiceCommands = runCommandsServicesSingle;
    export const runSingleService = runCommandsServicesSingle;
    export const runSingleSv = runCommandsServicesSingle;

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
    export const serviceStop = stop;
    export const svStop = stop;
    export const stopService = stop;
    export const stopSv = stop;

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
    export const serviceDisable = disable;
    export const svDisable = disable;
    export const disableService = disable;
    export const disableSv = disable;


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
    export const serviceRemove = remove;
    export const svRemove = remove;
    export const removeService = remove;
    export const removeSv = remove;
}

export default CommandsServices;

