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
    timestamps?: boolean;
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
    filePath: process.env.LOG_FILEPATH,
    timestamps: process.env.LOG_TIMESTAMPS === 'true'
};

function shouldLog(level: LogLevel): boolean {
    return levelPriority[level] >= levelPriority[config.level];
}

let writeQueue: Promise<void> = Promise.resolve();

function writeToFile(message: string): void {
    if (!config.filePath) return;
    const file = resolve(config.filePath);
    writeQueue = writeQueue.then(async () => {
        try {
            await fs.appendFile(file, message + '\n');
        } catch {
            // ignore file write errors
        }
    });
}

function logMessage(level: LogLevel, message: string, color: (text: string) => string): void {
    if (!shouldLog(level)) return;
    const line = config.timestamps ? `${new Date().toISOString()} ${message}` : message;
    log({ message: line, color });
    writeToFile(line);
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
