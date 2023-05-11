/**
 * Generalizes literal types. For example: if given 2, is number. If given "foo", is string. If given 4n, is bigint. Does not work with booleans.
 */
export type General<T> = T extends number
    ? number
    : T extends bigint
    ? bigint
    : T extends string
    ? string
    : T;
