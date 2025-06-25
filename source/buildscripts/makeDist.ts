import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

async function concatFiles(files: string[], dest: string) {
    const buffers = await Promise.all(files.map(f => readFile(f)));
    await writeFile(dest, Buffer.concat(buffers));
}

async function main() {
    const usePrompt = process.argv.includes('--prompt');
    const base = 'sea';
    const files = usePrompt
        ? [join(base, 'sea-sfx-gui.sfx'), join(base, 'sea-sfx-config.txt'), join(base, 'sea-archive.7z')]
        : [join(base, 'sea-sfx.sfx'), join(base, 'sea-archive.7z')];
    await mkdir(join(base, 'dist'), { recursive: true });
    await concatFiles(files, join(base, 'dist', 'patcherjs-min.exe'));
}

main().catch(err => { console.error(err); process.exit(1); });
