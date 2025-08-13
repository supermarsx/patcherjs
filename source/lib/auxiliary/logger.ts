import colorsCli from 'colors-cli';
import { appendFileSync } from 'fs';
import { resolve } from 'path';

import Debug from './debug.js';
const { log } = Debug;

const { white, green_bt, yellow_bt, red_bt } = colorsCli;

type LogLevel = 'info' | 'warn' | 'error' | 'silent';

interface LoggerConfig {
    level: LogLevel;
    filePath?: string;
}

const levelPriority: Record<LogLevel, number> = {
    info: 0,
    warn: 1,
    error: 2,
    silent: 3
};

let config: LoggerConfig = {
    level: (process.env.LOG_LEVEL as LogLevel) || 'info',
    filePath: process.env.LOG_FILEPATH
};

function shouldLog(level: LogLevel): boolean {
    return levelPriority[level] >= levelPriority[config.level];
}

function writeToFile(message: string): void {
    if (!config.filePath) return;
    try {
        appendFileSync(resolve(config.filePath), message + '\n');
    } catch {
        // ignore file write errors
    }
}

function logMessage(level: LogLevel, message: string, color: (text: string) => string): void {
    if (!shouldLog(level)) return;
    log({ message, color });
    writeToFile(message);
}

export namespace Logger {
    export function setConfig(newConfig: Partial<LoggerConfig>): void {
        config = { ...config, ...newConfig };
    }

    export function logInfo(message: string): void {
        logMessage('info', message, white);
    }

    export function logSuccess(message: string): void {
        logMessage('info', message, green_bt);
    }

    export function logWarn(message: string): void {
        logMessage('warn', message, yellow_bt);
    }

    export function logError(message: string): void {
        logMessage('error', message, red_bt);
    }
}

export default Logger;
