import Command from '../commands/command.js';
const { runCommand } = Command;

import { Debug as debug } from '../auxiliary/debug.js';

import colorsCli from 'colors-cli';
const { white, green_bt } = colorsCli;

export namespace Cleanup {
    /**
     * @internal
     * Clean up build space, folders and paths
     * 
     * @example
     * ```
     * cleanupBuild();
     * ```
     * @returns Nada
     * @since 0.0.1
    */
    export async function cleanupBuild(): Promise<void> {
        debug.enable({ logging: false });
        debug.log({ message: `Cleaning up build space`, color: white });

        const parameters: string = '';

        debug.log({ message: `Deleting .\\sea\\sea-prep.blob`, color: white });
        const seaBlob: string = `del .\\sea\\sea-prep.blob`;
        await runCommand({ command: seaBlob, parameters });

        debug.log({ message: `Deleting .\\sea\\sea-archive.7z`, color: white });
        const seaArchive: string = `del .\\sea\\sea-archive.7z`;
        await runCommand({ command: seaArchive, parameters });

        debug.log({ message: `Deleting .\\sea\\executable.js`, color: white });
        const executablejs: string = `del .\\sea\\executable.js`;
        await runCommand({ command: executablejs, parameters });

        debug.log({ message: `Deleting .\\sea\\predist\\* files`, color: white });
        const seaPredist: string = `rmdir /s /q .\\sea\\predist\\ && mkdir .\\sea\\predist\\`;
        await runCommand({ command: seaPredist, parameters });

        debug.log({ message: `Deleting .\\sea\\dist\\* files`, color: white });
        const seaDist: string = `rmdir /s /q .\\sea\\dist\\ && mkdir .\\sea\\dist\\`;
        await runCommand({ command: seaDist, parameters });

        debug.log({ message: `Deleting .\\dist\\* files`, color: white });
        const dist: string = `rmdir /s /q .\\dist\\ && mkdir .\\dist\\`;
        await runCommand({ command: dist, parameters });

        debug.log({ message: `Deleting .\\docs\\* files`, color: white });
        const docs: string = `rmdir /s /q .\\docs\\ && mkdir .\\docs\\`;
        await runCommand({ command: docs, parameters });

        debug.log({ message: `Deleting .\\tsconfig.tsbuildinfo`, color: white });
        const tsbuildinfo: string = `del .\\tsconfig.tsbuildinfo`;
        await runCommand({ command: tsbuildinfo, parameters });

        debug.log({ message: `Finished deleting build files`, color: green_bt });
    }
}

export default Cleanup;
