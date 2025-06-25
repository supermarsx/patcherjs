export type CryptBufferSubsets = {
    [key: string]: {
        offset: number,
        bytes?: number
    }
}

export type SubsetOptionsObject = {
    offset: number
    bytes ?: number | undefined
}
