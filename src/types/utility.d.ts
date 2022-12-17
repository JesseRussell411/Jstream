/**
 * Generalizes literal types. If 2, is a number. If "foo", is a string. If 4n, is a bigint. etc.
 */
export type General<T> = T extends number
    ? number
    : T extends bigint
    ? bigint
    : T extends string
    ? string
    : T;
