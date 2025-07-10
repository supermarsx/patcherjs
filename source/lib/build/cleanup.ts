import { rm, mkdir } from 'fs/promises';
import { join } from 'path';

import { Debug as debug } from '../auxiliary/debug.js';
import Logger from '../auxiliary/logger.js';
const { logInfo, logSuccess } = Logger;

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
        logInfo(`Cleaning up build space`);

        const deletePath = async (path: string, recursive: boolean = false) => {
            try {
                await rm(path, { force: true, recursive });
            } catch {
                // ignore errors while deleting
            }
        };

        logInfo(`Deleting ./sea/sea-prep.blob`);
        await deletePath(join('sea', 'sea-prep.blob'));

        logInfo(`Deleting ./sea/sea-archive.7z`);
        await deletePath(join('sea', 'sea-archive.7z'));

        logInfo(`Deleting ./sea/executable.js`);
        await deletePath(join('sea', 'executable.js'));

        logInfo(`Deleting ./sea/predist/* files`);
        await deletePath(join('sea', 'predist'), true);
        await mkdir(join('sea', 'predist'), { recursive: true });

        logInfo(`Deleting ./sea/dist/* files`);
        await deletePath(join('sea', 'dist'), true);
        await mkdir(join('sea', 'dist'), { recursive: true });

        logInfo(`Deleting ./dist/* files`);
        await deletePath('dist', true);
        await mkdir('dist', { recursive: true });

        logInfo(`Deleting ./docs/* files`);
        await deletePath('docs', true);
        await mkdir('docs', { recursive: true });

        logInfo(`Deleting ./tsconfig.tsbuildinfo`);
        await deletePath('tsconfig.tsbuildinfo');

        logSuccess(`Finished deleting build files`);
    }
}

export default Cleanup;
