# patcherjs

A small TypeScript binary patching utility. Originally built for Windows, it works both as a standalone application or library and will support Linux and macOS.

This tool/library is intended for patch developers and enthusiasts to streamline patch tool distribution.

![screenshot-patcherjs-min](https://github.com/supermarsx/patcherjs/assets/17675589/4f156087-8a3b-4c53-a692-c249e3155efd)

## Starting up

### As a library

Install using npm
```
$ npm install patcherjs
```
Simple running example
```
import { Patcher } from 'patcherjs';

Patcher.runPatcher({});
Patcher.runPatcher({ configFilePath: './my-config.json' });
```

### Use as standalone application or development

#### Capabilities and functions

Patcherjs has 3 main functions on its own:
- Patching binaries
- Executing arbitrary commands
    - Execute any basic command
    - Executing kill, system service or task scheduler commands
- Drop files in a directory

#### Get started

Download from releases or clone the repository
##### Use binaries from releases

`patcherjs-predist` - Just extract and edit
`patcherjs-dist` - Open as an archive with 7-zip extract files files and drop inside again

##### Clone the repository
```
$ git clone https://github.com/supermarsx/patcherjs
$ npm install
$ npm run ts-build
$ node dist/standalone/executable.js
$ node dist/standalone/executable.js --config ./my-config.json
```
The `--config` option allows you to specify a custom configuration file instead of the default `config.json`.

#### Running on Linux/macOS

Once the project adds support for these platforms the steps are the same:

```bash
npm run ts-build
node dist/standalone/executable.js --config ./my-config.json
```
The build pipeline will skip the signing step on non-Windows systems.
#### npm scripts

There are a collection of scripts that are used help manage the build process

`package.json` scripts:
```
   "scriptsComments": {
    "#GENERAL SCRIPTS#": "#SECTION#",
    "start": "Runs the patcher (executable.js)",
    "#BUILD SCRIPTS#": "#SECTION#",
    "ts-build-clean": "Typescript clean build to 'dist' folder",
    "ts-build": "Typescript build to 'dist' folder",
    "esbuild": "ESBuild the standalone executable into a JS file (executable.js) on the 'sea' folder",
    "sea-build": "Executes the SEA (single executable application) building script (builder.js) according to nodes sea generation guidelines (needs ts-build to be ran first)",
    "sea-pack": "Packs all files in 'patch_files_unpacked' and drops them into 'patch_files' to be used by the patcher",
    "sea-copy": "Copies 'config.json', 'patch_files' folder contents and 7zip binaries from node_modules to 'predist' folder (needs npm install to be ran first)",
    "sea-predist": "Compresses built SEA file and its additional files into a 7zip archive using predist script (predist.js) (needs ts-build to be ran first)",
    "sea-dist": "Creates distribution executable using Node script",
    "sea-dist-prompt": "Same as 'sea-dist' but uses the prompt SFX module",
    "sea-build-full": "Run full SEA build process including SFX ready for distribution (runs 'ts-build-clean', 'esbuild', 'sea-build', 'sea-copy', 'sea-predist' and 'sea-dist')",
    "sea-build-full-clean": "Same as 'sea-build-full' but executes 'sea-cleanup-full' first, serves as a full clean build",
    "sea-cleanup-full": "Build Typescript files and fully clean up build space",
    "sea-cleanup": "fully clean up build space",
    "sea-copy-config": "Copies 'config.json' to 'predist' folder using Node script",
    "sea-copy-patch_files": "Copies 'patch_files' folder contents to 'predist' folder using Node script",
    "sea-copy-7z": "Copies 7-zip binaries from 'node_modules' to 'predist' folder using Node script",
    "generate-docs": "Generates documentation using typedoc to 'docs' folder"
  },
```

#### Running tests

Run the Jest suite with the provided npm script. It builds the TypeScript sources and then executes Jest.
```sh
npm test
```

#### Example files

The project comes with an example `.patch` file and a `.dll` file to be packed, these files should be removed and you should add your own files.

#### Build steps

Theres two ways of using patcherjs as an applications, as multi file application which contains a nodejs SEA or a single SFX file.

1. Run the following build script to do a full build
```
$ npm run sea-build-full-clean
```
2. Grab your file from `sea/dist` folder if you want a single executable otherwise grab all files from `sea/predist` if you prefer a multi file approach.

> **Note**
> The build pipeline expects a Windows environment and uses `signtool` to remove the signature from the copied Node binary. When running on other platforms this step is skipped and the resulting executable will remain unsigned.

#### Project structure

`Project folder`
```
| Project folder
 \
  | dist - Compiled Typescript files
  | docs - Generate typedoc documentation
  | misc_bin - Miscellaneous binaries, containing signtool that can be installed to %PATH% to be used in the build process
  | node_modules - Typical node modules folder
  | patch_files - Contains '.patch' files to be used by the script and packed '.pack' files to be dropped by the script
  | patch_files_unpacked - Contains all the unpacked files to be packed by patcherjs and dropped into 'patch_files' folder
  | sea - Contains all the files pertaining to SEA (single executable application) build process
   \
    | sea/dist - Final build step folder which will contain the SEA SFX packed executable ready for distribution
     \
      | patcherjs-min.exe - Built single file executable ready for distribution (unpacks itself and runs patcherjs.exe)
    | sea/predist - A Intermediate build step folder containing all the working parts of the patcher that can work but is not contained into a SFX file
     \
      | patch_files - Folder copied from root containing all patch files and filedrops
      | win - Folder containing 7-zip binaries
      | config.json - Application configuration copied from root
      | patcherjs.exe - Nodejs SEA containing all the functions necessary to patchers execution (runs executable.ts)
    | sea/sea-sfx.sfx - 7zip SFX module without prompt
    | sea/sea-sfx-config.txt - 7zip SFX module script (only necessary for prompt)
    | sea/sea-sfx-gui.sfx - 7zip SFX module with prompt
  | source - Folder containing all source files for the project
   \
    | source/buildscripts - Contains all scripts related to the build scripts described in package.json
    | source/lib - All the source code for the patcher inner workings and its different parts
     \
      | auxiliary - Folder containing all the auxiliary file, debug, uac and useful functions and operations
      | build - Folder containing all the build, packaging and cleanup functions and routines
      | commands - Folder containing all the command related functions and routines
      | configuration - Folder containing all the configuration functions and routines, and also constants
      | filedrops - Folder containing all the filedrops, encryption and packing functions and routines
      | patches - Folder containing all the buffer, parser and patches functions and routines
      | composites.ts - File containing the general 'runPatcher' function and related
    | source/standalone - Folder containing 'executable.ts' that is used as the patcherjs standalone application
  | config.json - File containing all the configurations used by patcherjs

```

#### config.json file
Patcherjs functions with a configuration json file using the following structure, generally the provided default `config.json` are the recommended values but you can set them as preferred and/or needed.

`config.json`
```
{
  "options": { // OPTIONS
    "general": { // OPTIONS > GENERAL, General options
      "exitOnNonAdmin": true, // Exit when current running user doesn't have administrative privileges, on `false` will continue
      "debug": true, // Enable debug messages (recommended)
      "logging": false, // Enable logging debug messages to file (untested)
      "runningOrder": [ // An array that defines in which order will the patcher run its commands, commands can be repeated though
        "commands", // Run commands
        "filedrops", // Run filedrops
        "patches" // Run binary patches
      ],
      "commandsOrder": [ // Within commands you can decide which type of command runs first
        "tasks", // Task scheduler commands
        "services", // System service commands
        "kill",  // Kill commands
        "general" // General arbitrary commands
      ],
      "onlyPackingMode": false // Use when you want to pack files using the SEA without access to source
    },
    "patches": { // OPTIONS > PATCHES, Patches related options
      "runPatches": true, // Set to false if you want to skip patches for some reason
      "forcePatch": false, // Set to true if you don't want to check for the current value, bulldozer mode basically
      "fileSizeCheck": true, // Check for file size before running patch
      "fileSizeThreshold": 0, // File size check threshold
      "skipWritePatch": false, // Skip writing patch (mostly for debug purposes, like simulate a patch but not actually patch)
      "failOnUnexpectedPreviousValue": false, // Fail patches if an unexpected previous/current value is found
      "warnOnUnexpectedPreviousValue": true, // Warn/throw a debug message that an unexpected previous/current value was found
      "nullPatch": false, // Just patch the offsets to null (basically 0, mostly useful just for debug)
      "unpatchMode": false, // Reverse previous/current with new value to basically reverse patch a file
      "verifyPatch": true, // Verify patch (not implemented)
      "backupFiles": true, // Create copy with '.bak' extension in the destination directory for every patched file
      "skipWritingBinary": false // Skip writing the patched buffer to file
    },
    "commands": { // OPTIONS > COMMANDS, Commands related options
      "runCommands": true // Set to false to skip running any commands
    },
    "filedrops": { // OPTIONS > FILEDROPS, Filedrops related options
      "runFiledrops": true, // Set to false to skip filedrops
      "isFiledropPacked": true, // Is file compressed in a password protected 7zip archive or not compressed at all (affects packing process)
      "isFiledropCrypted": true, // Is file encrypted (affects packing process)
      "backupFiles": true // Backup destination files with '.bak' before replacing them
    }
  },
  "patches": [ // A patches array, every object is related to a single '.patch' file
    {
      "name": "file.dll patch", // Patch display name, not important
      "patchFilename": "file.dll.patch", // .patch filename
      "fileNamePath": "${HOME}/Someapp/file.dll", // File path to patch, using HOME for cross-platform support
      "enabled": true // Is this specific patch enabled, set false to skip
    }
  ],
  "commands": { // Contains all the arrays of the different command types
    "tasks": [ // An array of task scheduler related commands
      {
        "name": "TestTaskApp-1", // Task scheduler name
        "command": "delete", // Either 'delete' or 'stop' those are the two available options
        "enabled": true // Set false to skip
      }
    ],
    "kill": [ // An array of processes to kill
      {
        "name": "testapp.exe", // Name of the process to kill
        "enabled": true // Set false to skip
      }
    ],
    "services": [ // An array of system service commands to run
      {
        "name": "TestService", // Name of the service
        "command": "delete", // Either 'stop', 'disable' or 'delete' the service
        "enabled": true // Set false to skip
      }
    ],
    "general": [ // An array of general commands to run
      {
        "name": "echo test", // Display name
        "command": "echo \"test\"", // Command to run, escape your special characters like backslash and quotes
        "enabled": true // Set false to skip
      }
    ]
  },
  "filedrops": [ // An array of file drops to run
    {
      "name": "helloworld.dll", // Display name
      "fileDropName": "helloworld.dll.pack", // Packed filename inside 'patch_files' directory
      "packedFileName": "helloworld.dll", // Original filename inside 'patch_files_unpacked' folder
      "fileNamePath": "${HOME}/Someapp/helloworld.dll", // Destination filename, using HOME for cross-platform support
      "decryptKey": "ad4bc8a11481000e4d8daf28412f867a", // Encryption/decryption password
      "enabled": true // Set to false to skip
    }
  ]
}

```
## On .patch files
### .patch file format

A .patch file should follow the following format.
Offsets may exceed 32-bits and are parsed as BigInt:
```
0002EB40: 03 00
0006AA00: 04 10
```
When patching binaries that require 64-bit addressing,
use 16-digit hexadecimal offsets. For example:
```
0000000012345678: 00 ff
```
`patcherjs` automatically switches to 64‑bit mode when a
patch includes an offset longer than eight hex digits or the
target file exceeds the `LARGE_FILE_THRESHOLD` (2&nbsp;GB).
```
OFFSET: PREVIOUS_VALUE NEW_VALUE
```
The value fields may contain 2, 4, 8 or 16 hex digits
(representing 1, 2, 4 or 8 bytes respectively). `patcherjs`
will automatically use the correct width when applying
the patch.
### Creating .patch files

You can create patch files by exporting patches from x64dbg or vbindiff applications.

## Built with
- NodeJS
- Typescript

## License
Distributed under MIT License. See`license.md`for more information.
