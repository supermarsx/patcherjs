import { cp, mkdir } from 'fs/promises';
import { join } from 'path';

async function copyConfig() {
    await mkdir(join('sea', 'predist'), { recursive: true });
    await cp('config.json', join('sea', 'predist', 'config.json'));
}

async function copyPatchFiles() {
    await mkdir(join('sea', 'predist', 'patch_files'), { recursive: true });
    await cp('patch_files', join('sea', 'predist', 'patch_files'), { recursive: true });
}

async function copySevenZip() {
    await mkdir(join('sea', 'predist', 'win'), { recursive: true });
    await cp(join('node_modules', '7zip-bin', 'win'), join('sea', 'predist', 'win'), { recursive: true });
}

async function main() {
    const action = process.argv[2];
    if (!action || action === 'all') {
        await copyConfig();
        await copySevenZip();
        await copyPatchFiles();
    } else if (action === 'config') {
        await copyConfig();
    } else if (action === 'patch') {
        await copyPatchFiles();
    } else if (action === 'sevenzip') {
        await copySevenZip();
    }
}

main();
