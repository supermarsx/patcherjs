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
    export async function waitForKeypress({ force = false }: { force?: boolean } = {}): Promise<void> {

        if (!force && !process.stdin.isTTY)
            return;

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
}

export default Console;
