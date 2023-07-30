import readline, { Interface } from 'readline';

export namespace Console {
    /**
     * @internal
     * Wait for a keypress [ENTER]
     * 
     * @example
     * ```
     * waitForKeypress();
     * ```
     * @returns Nada
     * @since 0.0.1
     */
    export async function waitForKeypress(): Promise<void> {

        const consoleIface: Interface = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise<void>(function (resolve) {
            const emptyStr: string = ``;
            consoleIface.question(emptyStr, function () {
                consoleIface.close();
                resolve();
            });
        });
    }
    export const waitForKey = waitForKeypress;
}

export default Console;