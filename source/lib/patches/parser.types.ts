/**
 * Patch object type, containing an decimal offset, previous and a new value
 */
export type PatchObject = {
    /** Decimal offset value */
    offset: bigint,
    /** Decimal current/previous value to find */
    previousValue: number | bigint,
    /** Decimal new value to previous/current value */
    newValue: number | bigint,
    /** Number of bytes this patch touches */
    byteLength: 1 | 2 | 4 | 8
};

/**
 * A collection of `PatchObject`s
 */
export type PatchArray = PatchObject[];
