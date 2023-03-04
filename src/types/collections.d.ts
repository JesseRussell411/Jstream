export type StandardCollection<T> =
    | Array<T>
    | Set<T>
    | (T extends [infer K, infer V] ? Map<K, V> : never);

export type ReadonlyStandardCollection<T> =
    | ReadonlyArray<T>
    | ReadonlySet<T>
    | (T extends [infer K, infer V] ? ReadonlyMap<K, V> : never);

export type EntryLike<K, V> =
    | [K, V, ...any]
    | { 0: K; 1: V; [key: keyof any]: any };

export type EntryLikeKey<K> = [K, ...any] | { 0: K; [key: keyof any]: any };

export type EntryLikeValue<V> =
    | [any, V, ...any]
    | { 1: V; [key: keyof any]: any };

/** The readonly version of the given collection type. */
export type AsReadonly<
    Collection extends Array<any> | Set<any> | Map<any, any> | Record<keyof any, any>
> = Collection extends Array<infer T>
    ? ReadonlyArray<T>
    : Collection extends Set<infer T>
    ? ReadonlySet<T>
    : Collection extends Map<infer K, infer V>
    ? ReadonlyMap<K, V>
    : Readonly<Collection>;

    
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

