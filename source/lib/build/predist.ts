import Seven, { ZipStream } from 'node-7z';

import { Debug as debug } from '../auxiliary/debug.js';
import Logger from '../auxiliary/logger.js';
const { logInfo, logSuccess, logError } = Logger;

import Constants from '../configuration/constants.js';
const { PACKMETHOD, SEVENZIPBIN_FILEPATH } = Constants;

export namespace Predist {
    /**
     * @internal
     * Packages every file inside ./sea/predist folder into ./sea/sea-archive.7z to later be converted into an SFX auto executable
     * 
     * @example
     * ```
     * predistPackage();
     * ```
     * @returns Nada
     * @since 0.0.1
     */
    export async function predistPackage(): Promise<void> {
        return await new Promise<void>((resolve, reject) => {
            try {
                const seaArchiveName: string = `sea-archive.7z`;

                debug.enable({ logging: false });
                logInfo(`Packaging ${seaArchiveName}`);
                const options: {} = {
                    method: PACKMETHOD,
                    $bin: SEVENZIPBIN_FILEPATH
                };
                const packageStream: ZipStream = Seven.add(`./sea/${seaArchiveName}`, `./sea/predist/*`, options);
                packageStream.on('end', function () {
                    logSuccess(`Packaged ${seaArchiveName} successfully`);
                    resolve();
                });
                packageStream.on('error', function (error) {
                    logError(`An error has ocurred while predist packaging ${error}`);
                    reject(error);
                });

            } catch (error) {
                logError(`An error has ocurred while predist packaging ${error}`);
                reject(error);
            }
        });
    }
}

export default Predist;
