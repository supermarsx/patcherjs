import Seven, { ZipStream } from 'node-7z';

import { Debug as debug } from '../auxiliary/debug.js';

import colorsCli from 'colors-cli';
const { red_bt, white, green_bt } = colorsCli;

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
        try {
            const seaArchiveName: string = `sea-archive.7z`;

            debug.enable({ logging: false });
            debug.log({ message: `Packaging ${seaArchiveName}`, color: white });
            const options: {} = {
                method: [PACKMETHOD],
                $bin: SEVENZIPBIN_FILEPATH
            };
            const packageStream: ZipStream = Seven.add(`./sea/${seaArchiveName}`, `./sea/predist/*`, options);
            packageStream.on('end', function () {
                debug.log({ message: `Packaged ${seaArchiveName} successfully`, color: green_bt });
            });

        } catch (error) {
            debug.log({ message: `An error has ocurred while predist packaging ${error}`, color: red_bt });
        }
    }
    export const predistributionPackage = predistPackage;
}

export default Predist;