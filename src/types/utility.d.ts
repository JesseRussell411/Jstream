/**
 * Generalizes literal types. For example: if 2, is number. If "foo", is string. If 4n, is bigint. Does not work with booleans.
 */
export type General<T> = T extends number
    ? number
    : T extends bigint
    ? bigint
    : T extends string
    ? string
    : T;

export type AsMap<I extends Iterable<any>> = I extends Iterable<infer T>
    ? T extends EntryLike<infer K, infer V>
        ? Map<K, V>
        : T extends EntryLikeKey<infer K>
        ? Map<K, unknown>
        : T extends EntryLikeValue<infer V>
        ? Map<unknown, V>
        : Map<unknown, unknown>
    : never;

export type AsMapWithKey<I extends Iterable<any>, K> = I extends Iterable<
    infer T
>
    ? T extends EntryLikeValue<infer V>
        ? Map<K, V>
        : Map<K, unknown>
    : never;

export type AsMapWithValue<I extends Iterable<any>, V> = I extends Iterable<
    infer T
>
    ? T extends EntryLikeKey<infer K>
        ? Map<K, V>
        : Map<unknown, V>
    : never;

export type ToObject<I extends Iterable<any>> = I extends Iterable<infer T>
    ? T extends EntryLike<infer K, infer V>
        ? K extends keyof any
            ? Record<K, V>
            : never
        : T extends EntryLikeKey<infer K>
        ? K extends keyof any
            ? Record<K, unknown>
            : never
        : T extends EntryLikeValue<infer V>
        ? Record<any, V>
        : Record<any, unknown>
    : never;

export type ToObjectWithKey<
    I extends Iterable<any>,
    K extends keyof any
> = I extends Iterable<infer T>
    ? T extends EntryLikeValue<infer V>
        ? Record<K, V>
        : Record<K, unknown>
    : never;

export type ToObjectWithValue<I extends Iterable<any>, V> = I extends Iterable<
    infer T
>
    ? T extends EntryLikeKey<infer K>
        ? K extends keyof any
            ? Record<K, V>
            : Record<any, V>
        : Record<any, unknown>
    : never;
