export type DeLiteral<T> = T extends number
    ? number
    : T extends bigint
    ? bigint
    : T extends string
    ? string
    : T;
