export type OptionsType = {
    /** Force patch, independent of the current value */
    forcePatch: boolean, 
    /** Unpatch mode or reverse patch, previous/current value is new value and vice-versa */
    unpatchMode: boolean, 
    nullPatch: boolean,
    failOnUnexpectedPreviousValue: boolean,
    warnOnUnexpectedPreviousValue: boolean,
    skipWritePatch: boolean,
    /** Allow patching offsets past the end of the file */
    allowOffsetOverflow: boolean,
    /** Treat multi-byte values as big-endian */
    bigEndian?: boolean
};
