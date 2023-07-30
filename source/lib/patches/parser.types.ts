/**
 * Patch object type, containing an decimal offset, previous and a new value
 */
export type PatchObject = {
    /** Decimal offset value */
    offset: number,
    /** Decimal current/previous value to find */
    previousValue: number,
    /** Decimal new value to previous/current value */
    newValue: number
};

/**
 * A collection of `PatchObject`s
 */
export type PatchArray = PatchObject[];
