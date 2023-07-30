export namespace DebugWrappers {
    /**
     * Parse boolean value
     * 
     * @param params.value Value
     * @example
     * ```
     * parseBoolean({ value });
     * ```
     * @returns True or false
     * @since 0.0.1
     */
    export function parseBoolean({ value }:
        { value: string | undefined }): boolean {
        if (value === undefined) value = '';
        const booleanRegexp: RegExp = /^true$/i;
        const booleanValue: boolean = booleanRegexp.test(value.toString());
        return booleanValue;
    }
}

export default DebugWrappers;
