import colorsCli from 'colors-cli';
import { promises as fs } from 'fs';
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

function getLogLevel(level?: string): LogLevel {
    return level && level in levelPriority ? (level as LogLevel) : 'info';
}

let config: LoggerConfig = {
    level: getLogLevel(process.env.LOG_LEVEL),
    filePath: process.env.LOG_FILEPATH
};

function shouldLog(level: LogLevel): boolean {
    return levelPriority[level] >= levelPriority[config.level];
}

async function writeToFile(message: string): Promise<void> {
    if (!config.filePath) return;
    try {
        await fs.appendFile(resolve(config.filePath), message + '\n');
    } catch {
        // ignore file write errors
    }
}

function logMessage(level: LogLevel, message: string, color: (text: string) => string): void {
    if (!shouldLog(level)) return;
    log({ message, color });
    void writeToFile(message);
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
