export class PatchParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PatchParseError';
    }
}

export class FileIOError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FileIOError';
    }
}

export interface CommandErrorOptions {
    stdout?: string;
    stderr?: string;
    exitCode?: number | null;
}

export class CommandError extends Error {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    constructor(message: string, { stdout = '', stderr = '', exitCode = null }: CommandErrorOptions = {}) {
        super(message);
        this.name = 'CommandError';
        this.stdout = stdout;
        this.stderr = stderr;
        this.exitCode = exitCode;
    }
}

export default { PatchParseError, FileIOError, CommandError };
