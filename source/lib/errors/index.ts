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

export class CommandError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CommandError';
    }
}

export default { PatchParseError, FileIOError, CommandError };
