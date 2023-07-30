import { basename } from 'path';

export namespace Callee {
    /**
     * @internal
     * Get which filename is calling a function
     * 
     * @example
     * ```
     * getCallingFilename();
     * ```
     * @returns A filename calling the function or null on failure
     * @since 0.0.1
     */
    export function getCallingFilename(): string | null {
        try {
            const stack: string | undefined = new Error().stack;
            if (stack) {
                const newLineBreak: string = '\n';
                const lineToRemove: number = 1;
                const stackLines: string[] = stack.split(newLineBreak).slice(lineToRemove);
                const firstLevelCalleeLine: string | undefined = stackLines.find(function (line) {
                    const functionName: string = 'getCallingFilename';
                    return !line.includes(functionName);
                });
                if (firstLevelCalleeLine !== null && firstLevelCalleeLine !== undefined) {
                    const secondLevelCalleeLine: string | undefined = stackLines[stackLines.indexOf(firstLevelCalleeLine) + 1];
                    if (secondLevelCalleeLine !== null && secondLevelCalleeLine !== undefined) {
                        const matchingRegExp: RegExp = /\((.*):\d+:\d+\)/;
                        const filenameMatch: RegExpMatchArray | null = secondLevelCalleeLine.match(matchingRegExp);
                        if (filenameMatch !== null) {
                            const filename: string = filenameMatch[1];
                            return basename(filename);
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