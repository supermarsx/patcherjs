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
    maxSize?: number;
    rotationCount?: number;
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
    // include ISO timestamps only when explicitly enabled
    timestamps: process.env.LOG_TIMESTAMPS === 'true',
    maxSize: process.env.LOG_MAX_SIZE ? Number(process.env.LOG_MAX_SIZE) : undefined,
    rotationCount: process.env.LOG_ROTATION_COUNT ? Number(process.env.LOG_ROTATION_COUNT) : undefined
};

function shouldLog(level: LogLevel): boolean {
    return levelPriority[level] >= levelPriority[config.level];
}

let writeQueue: Promise<void> = Promise.resolve();

async function rotateLogs(file: string): Promise<void> {
    const count = config.rotationCount ?? 1;
    if (count > 0) {
        try {
            await fs.rm(`${file}.${count}`);
        } catch {
            // ignore remove errors
        }
        for (let i = count - 1; i >= 1; i--) {
            try {
                await fs.rename(`${file}.${i}`, `${file}.${i + 1}`);
            } catch {
                // ignore rename errors
            }
        }
        try {
            await fs.rename(file, `${file}.1`);
        } catch {
            // ignore rename errors
        }
    } else {
        try {
            await fs.truncate(file, 0);
        } catch {
            // ignore truncate errors
        }
    }
}

function writeToFile(line: string): void {
    if (!config.filePath) return;
    const file = resolve(config.filePath);
    writeQueue = writeQueue.then(async () => {
        try {
            if (config.maxSize) {
                try {
                    const stats = await fs.stat(file);
                    if (stats.size >= config.maxSize) {
                        await rotateLogs(file);
                    }
                } catch {
                    // ignore stat errors
                }
            }
            await fs.appendFile(file, line + '\n');
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

    export async function flush(): Promise<void> {
        await writeQueue;
    }
}

export default Logger;
