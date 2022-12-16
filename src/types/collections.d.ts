export type StandardCollection<T> =
    | Array<T>
    | Set<T>
    | (T extends [infer K, infer V] ? Map<K, V> : never);
export type ReadonlyStandardCollection<T> =
    | ReadonlyArray<T>
    | ReadonlySet<T>
    | (T extends [infer K, infer V] ? ReadonlyMap<K, V> : never);
