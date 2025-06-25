import { basename } from 'path';
import { fileURLToPath } from 'url';

export namespace Callee {
    /**
     * @internal
     * Get the filename of the caller module using stack inspection
     * and {@link import.meta.url}.
     *
     * @example
     * ```
     * getCallingFilename();
     * ```
     * @returns Base filename of the caller or `null` on failure
     * @since 0.0.1
     */
    export function getCallingFilename(): string | null {
        try {
            const stack: string | undefined = new Error().stack;
            if (stack) {
                const stackLines: string[] = stack.split('\n');
                const thisFile: string = fileURLToPath(import.meta.url);
                const thisIndex: number = stackLines.findIndex(function (line) {
                    return line.includes(thisFile);
                });
                if (thisIndex !== -1) {
                    let callerLine: string | undefined;
                    for (let i = thisIndex + 1; i < stackLines.length; i++) {
                        const line: string = stackLines[i];
                        if (!line.includes(thisFile)) {
                            callerLine = line;
                            break;
                        }
                    }
                    if (callerLine) {
                        const matchingRegExp: RegExp = /\((.*):\d+:\d+\)|at (.*):\d+:\d+$/;
                        const filenameMatch: RegExpMatchArray | null = callerLine.match(matchingRegExp);
                        if (filenameMatch !== null) {
                            const filename: string | undefined = filenameMatch[1] ?? filenameMatch[2];
                            if (filename)
                                return basename(fileURLToPath(filename));
                        }
                    }
                }
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * @internal
     * Get which function is calling this function
     * 
     * @example
     * ```
     * getCallingFunctionName();
     * ```
     * @returns Function name or null
     * @since 0.0.1
     */
    export function getCallingFunctionName(): string | null {
        try {
            const stack: string | undefined = new Error().stack;
            if (stack) {
                const newLineBreak: string = '\n';
                const lineToRemove: number = 1;
                const stackLines: string[] = stack.split(newLineBreak).slice(lineToRemove);
                const firstLevelCalleeLine: string | undefined = stackLines.find(function (line) {
                    const functionName: string = 'getCallingFunctionName';
                    return !line.includes(functionName);
                });
                if (firstLevelCalleeLine !== null && firstLevelCalleeLine !== undefined) {
                    const secondLevelCalleeLine: string | undefined = stackLines[stackLines.indexOf(firstLevelCalleeLine) + 1];
                    if (secondLevelCalleeLine !== null && secondLevelCalleeLine !== undefined) {
                        const matchingRegExp: RegExp = /at (\S+)/;
                        const functionMatch: RegExpMatchArray | null = secondLevelCalleeLine.match(matchingRegExp);
                        if (functionMatch !== null) {
                            const functionName: string = functionMatch[1];
                            const splitChar: string = '.';
                            if (functionName.includes(splitChar)) {
                                const splitFunctionName: string[] = functionName.split(splitChar);
                                const splitFunctionLength: number = splitFunctionName.length;
                                const splitFunctionLengthThreshold: number = 2;
                                if (splitFunctionLength === splitFunctionLengthThreshold) {
                                    const actualFunctionName = splitFunctionName[splitFunctionLengthThreshold - 1];
                                    return actualFunctionName;
                                }
                            }
                            return basename(functionName);
                        }
                    }
                }
            }
            return null;

        } catch {
            return null;
        }
    }
}

export default Callee;