export type OptionsType = {
    /** Force patch, independent of the current value */
    forcePatch: boolean, 
    /** Unpatch mode or reverse patch, previous/current value is new value and vice-versa */
    unpatchMode: boolean, 
    nullPatch: boolean,
    failOnUnexpectedPreviousValue: boolean,
    warnOnUnexpectedPreviousValue: boolean,
    skipWritePatch: boolean
};
