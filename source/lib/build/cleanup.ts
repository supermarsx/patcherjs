import { rm, mkdir } from 'fs/promises';
import { join } from 'path';

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

        const deletePath = async (path: string, recursive: boolean = false) => {
            try {
                await rm(path, { force: true, recursive });
            } catch {
                // ignore errors while deleting
            }
        };

        debug.log({ message: `Deleting ./sea/sea-prep.blob`, color: white });
        await deletePath(join('sea', 'sea-prep.blob'));

        debug.log({ message: `Deleting ./sea/sea-archive.7z`, color: white });
        await deletePath(join('sea', 'sea-archive.7z'));

        debug.log({ message: `Deleting ./sea/executable.js`, color: white });
        await deletePath(join('sea', 'executable.js'));

        debug.log({ message: `Deleting ./sea/predist/* files`, color: white });
        await deletePath(join('sea', 'predist'), true);
        await mkdir(join('sea', 'predist'), { recursive: true });

        debug.log({ message: `Deleting ./sea/dist/* files`, color: white });
        await deletePath(join('sea', 'dist'), true);
        await mkdir(join('sea', 'dist'), { recursive: true });

        debug.log({ message: `Deleting ./dist/* files`, color: white });
        await deletePath('dist', true);
        await mkdir('dist', { recursive: true });

        debug.log({ message: `Deleting ./docs/* files`, color: white });
        await deletePath('docs', true);
        await mkdir('docs', { recursive: true });

        debug.log({ message: `Deleting ./tsconfig.tsbuildinfo`, color: white });
        await deletePath('tsconfig.tsbuildinfo');

        debug.log({ message: `Finished deleting build files`, color: green_bt });
    }
}

export default Cleanup;
