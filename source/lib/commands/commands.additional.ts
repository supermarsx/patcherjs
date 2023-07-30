import * as path from 'path';

import Debug from '../auxiliary/debug.js';
const { log } = Debug;

import colorsCli from 'colors-cli';
const { white } = colorsCli;

export namespace CommandsAdditional {
    /**
     * Get directory alias full path
     * 
     * @param params.alias Alias to get path
     * @example
     * ```
     * getDirectoryAlias({ alias });
     * ``` 
     * @returns Resolved path or empty string on failure
     * @since 0.0.1
     */
    export async function getDirectoryAlias({ alias }:
        { alias: string }): Promise<string> {
        try {
            const aliasRegex: RegExp = /%([^%]+)%/g;
            const matches = alias.matchAll(aliasRegex);

            for (const match of matches) {
                const environmentVariable: string = match[1];
                const environmentValue: string | undefined = process.env[environmentVariable];

                if (!environmentValue)
                    throw new Error(`Environment variable '${environmentVariable}' not found.`);

                alias = alias.replace(match[0], environmentValue);
            }

            const resolvedPath: string = path.resolve(alias);
            log({ message: `Resolved ${alias} to ${resolvedPath}`, color: white });
            return resolvedPath;
        } catch {
            return '';
        }
    }
}

export default CommandsAdditional;

