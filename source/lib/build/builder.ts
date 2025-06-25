import Command from '../commands/command.js';
const { runCommand } = Command;

//import { randomBytes } from 'crypto';

import { Debug as debug } from '../auxiliary/debug.js';

import colorsCli from 'colors-cli';
const { white, green_bt } = colorsCli;

export namespace Builder {
    /**
     * @internal
     * Build executable
     * 
     * @example
     * ```
     * buildExecutable();
     * ```
     * @returns Nada
     * @since 0.0.1
     */
    export async function buildExecutable(): Promise<void> {
        debug.enable({ logging: false });
        debug.log({ message: `Building executable`, color: white });

        debug.log({ message: `Creating blob`, color: white });
        const nodeBin: string = `node`;
        const blobParameters: string = `--experimental-sea-config sea-config.json`;
        await runCommand({ command: nodeBin, parameters: blobParameters });

        debug.log({ message: `Copying node binary`, color: white });
        const binaryName: string = process.platform === 'win32'
            ? `./sea/predist/patcherjs.exe`
            : `./sea/predist/patcherjs`;
        const nodeCopyParameters: string = `-e "require('fs').copyFileSync(process.execPath, '${binaryName}')"`;
        await runCommand({ command: nodeBin, parameters: nodeCopyParameters });

        if (process.platform === 'win32') {
            debug.log({ message: `Removing signature`, color: white });
            const signtoolBin: string = `signtool`;
            const signtoolUnsigningParameters: string = `remove /s ${binaryName}`;
            await runCommand({ command: signtoolBin, parameters: signtoolUnsigningParameters });
        } else {
            debug.log({ message: `Skipping signature removal step on non-Windows platform`, color: white });
        }

        debug.log({ message: `Injecting script`, color: white });
        const npxBin: string = `npx`;
        const fuseRandomBytes: string = `fce680ab2cc467b6e072b8b5df1996b2` //randomBytes(16).toString(`hex`);
        const injectionParameters1: string = `postject ${binaryName} NODE_SEA_BLOB ./sea/sea-prep.blob`;
        const injectionParameters2: string = `--sentinel-fuse NODE_SEA_FUSE_${fuseRandomBytes}`;
        const injectionParameters: string = `${injectionParameters1} ${injectionParameters2}`;
        await runCommand({ command: npxBin, parameters: injectionParameters });

        debug.log({ message: `Built unsigned node sea binary`, color: green_bt });

        //debug.log({ message: `Signing binary`, color: white });
        //const signtoolSigningParameters: string = `sign /fd SHA256 ${binaryName}`;
        //await runCommand({ command: signtoolBin, parameters: signtoolSigningParameters });
    }

}

export default Builder;
