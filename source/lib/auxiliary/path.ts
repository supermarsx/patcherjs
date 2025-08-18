import Logger from './logger.js';
const { logWarn } = Logger;

export namespace Path {
    /**
     * Replace `${VAR}` tokens within a path string with environment variable values.
     *
     * @param params.path Path string potentially containing `${VAR}` tokens
     * @example
     * ```
     * resolveEnvPath({ path: '${HOME}/file.txt' });
     * ```
     * @returns Resolved path with environment variables substituted
     * @since 0.0.1
     */
    export function resolveEnvPath({ path }:{ path: string }): string {
        let resolvedPath: string = path.replace(/^~(?=$|[\\/])/, (): string => {
            const home: string | undefined = process.env.HOME;
            if (home === undefined)
                logWarn('Environment variable HOME is not defined');
            return home ?? '';
        });

        resolvedPath = resolvedPath.replace(/\$\{(.*?)\}/g, (_match: string, name: string): string => {
            const value: string | undefined = process.env[name];
            if (value === undefined)
                logWarn(`Environment variable ${name} is not defined`);
            return value ?? '';
        });

        resolvedPath = resolvedPath.replace(/%([^%]+)%/g, (_match: string, name: string): string => {
            const value: string | undefined = process.env[name];
            if (value === undefined)
                logWarn(`Environment variable ${name} is not defined`);
            return value ?? '';
        });

        return resolvedPath;
    }
}

export default Path;
