import colorsCli from 'colors-cli';
import Debug from './debug.js';
const { log } = Debug;
const { white, green_bt, yellow_bt, red_bt } = colorsCli;

export namespace Logger {
    export function logInfo(message: string): void {
        log({ message, color: white });
    }

    export function logSuccess(message: string): void {
        log({ message, color: green_bt });
    }

    export function logWarn(message: string): void {
        log({ message, color: yellow_bt });
    }

    export function logError(message: string): void {
        log({ message, color: red_bt });
    }
}

export default Logger;
