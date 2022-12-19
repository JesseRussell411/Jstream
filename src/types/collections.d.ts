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

export type AsReadonly<
    Collection extends Array<any> | Set<any> | Map<any, any> | Record<keyof any, any>
> = Collection extends Array<infer T>
    ? ReadonlyArray<T>
    : Collection extends Set<infer T>
    ? ReadonlySet<T>
    : Collection extends Map<infer K, infer V>
    ? ReadonlyMap<K, V>
    : Readonly<Collection>;
