import Command from '../commands/command.js';
const { runCommand } = Command;

//import { randomBytes } from 'crypto';

import { Debug as debug } from '../auxiliary/debug.js';
import Logger from '../auxiliary/logger.js';
const { logInfo, logSuccess } = Logger;

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
        logInfo(`Building executable`);

        logInfo(`Creating blob`);
        const nodeBin: string = `node`;
        const blobParameters: string[] = ['--experimental-sea-config', 'sea-config.json'];
        await runCommand({ command: nodeBin, parameters: blobParameters });

        logInfo(`Copying node binary`);
        const binaryName: string = process.platform === 'win32'
            ? `./sea/predist/patcherjs.exe`
            : `./sea/predist/patcherjs`;
        const nodeCopyParameters: string[] = ['-e', `require('fs').copyFileSync(process.execPath, '${binaryName}')`];
        await runCommand({ command: nodeBin, parameters: nodeCopyParameters });

        if (process.platform === 'win32') {
            logInfo(`Removing signature`);
            const signtoolBin: string = `signtool`;
            const signtoolUnsigningParameters: string[] = ['remove', '/s', binaryName];
            await runCommand({ command: signtoolBin, parameters: signtoolUnsigningParameters });
        } else {
            logInfo(`Skipping signature removal step on non-Windows platform`);
        }

        logInfo(`Injecting script`);
        const npxBin: string = `npx`;
        const fuseRandomBytes: string = `fce680ab2cc467b6e072b8b5df1996b2` //randomBytes(16).toString(`hex`);
        const injectionParameters: string[] = [
            'postject',
            binaryName,
            'NODE_SEA_BLOB',
            './sea/sea-prep.blob',
            '--sentinel-fuse',
            `NODE_SEA_FUSE_${fuseRandomBytes}`
        ];
        await runCommand({ command: npxBin, parameters: injectionParameters });

        logSuccess(`Built unsigned node sea binary`);

        //debug.log({ message: `Signing binary`, color: white });
        //const signtoolSigningParameters: string = `sign /fd SHA256 ${binaryName}`;
        //await runCommand({ command: signtoolBin, parameters: signtoolSigningParameters });
    }

}

export default Builder;
