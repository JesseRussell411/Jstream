import Jstream from "../Jstream";
import { Awaitable, AwaitableIterable } from "../types/async";
import {
    EntryLikeKey,
    EntryLikeValue,
    ReadonlyStandardCollection,
    StandardCollection,
} from "../types/collections";
import { AsMap, AsMapWithKey, AsMapWithValue } from "../types/utility";
import { identity } from "./functional";
import { isIterable, isStandardCollection } from "./typeGuards";

/**
 * In-place Fisher-Yates shuffle of the given array.
 */
export function fisherYatesShuffle(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.trunc(Math.random() * (i + 1));

        const temp = array[i]!;
        array[i] = array[j]!;
        array[j] = temp;
    }
}

export function toArray<T>(items: Iterable<T>): T[];
export function toArray<T>(items: AsyncIterable<T>): Promise<Awaited<T>[]>;
export function toArray<T>(
    items: AwaitableIterable<T>
): T[] | Promise<Awaited<T>[]>;

export function toArray<T>(
    items: AwaitableIterable<T>
): T[] | Promise<Awaited<T>[]> {
    if (isIterable(items)) {
        return [...items];
    } else {
        return (async () => {
            const arr: Awaited<T>[] = [];
            for await (const item of items) {
                arr.push(item);
            }
            return arr;
        })();
    }
}

export function toSet<T>(items: Iterable<T>): Set<T>;
export function toSet<T>(items: AsyncIterable<T>): Promise<Set<Awaited<T>>>;
export function toSet<T>(
    items: AwaitableIterable<T>
): Set<T> | Promise<Set<Awaited<T>>>;

export function toSet<T>(
    items: AwaitableIterable<T>
): Set<T> | Promise<Set<Awaited<T>>> {
    if (isIterable(items)) {
        return new Set(items);
    } else {
        return (async () => {
            const arr = new Set<Awaited<T>>();
            for await (const item of items) {
                arr.add(item);
            }
            return arr;
        })();
    }
}

export function toMap<T>(collection: Iterable<T>): AsMap<Iterable<T>>;

export function toMap<T, V>(
    collection: Iterable<T>,
    keySelector: undefined,
    valueSelector: (item: T, index: number) => V
): AsMapWithValue<Iterable<T>, V>;

export function toMap<T, K>(
    collection: Iterable<T>,
    keySelector: (item: T, index: number) => K
): AsMapWithKey<Iterable<T>, K>;

export function toMap<T, K, V>(
    collection: Iterable<T>,
    keySelector: (item: T, index: number) => K,
    valueSelector: (item: T, index: number) => V
): Map<K, V>;

export function toMap<
    T,
    K = T extends EntryLikeKey<infer K> ? K : unknown,
    V = T extends EntryLikeValue<infer V> ? V : unknown
>(
    collection: Iterable<T>,
    keySelector?: (item: T, index: number) => K,
    valueSelector?: (item: T, index: number) => V
): Map<K, V>;

export function toMap<T>(
    collection: AsyncIterable<T>
): Promise<AsMap<Iterable<Awaited<T>>>>;

export function toMap<T, V>(
    collection: AsyncIterable<T>,
    keySelector: undefined,
    valueSelector: (item: T, index: number) => V
): Promise<AsMapWithValue<Iterable<Awaited<T>>, Awaited<V>>>;

export function toMap<T, K>(
    collection: AsyncIterable<T>,
    keySelector: (item: T, index: number) => K
): Promise<AsMapWithKey<Iterable<Awaited<T>>, Awaited<K>>>;

export function toMap<T, K, V>(
    collection: AsyncIterable<T>,
    keySelector: (item: T, index: number) => K,
    valueSelector: (item: T, index: number) => V
): Promise<Map<Awaited<K>, Awaited<V>>>;

export function toMap<
    T,
    K = T extends EntryLikeKey<infer K> ? K : unknown,
    V = T extends EntryLikeValue<infer V> ? V : unknown
>(
    collection: AsyncIterable<T>,
    keySelector?: (item: T, index: number) => K,
    valueSelector?: (item: T, index: number) => V
): Promise<Map<Awaited<K>, Awaited<V>>>;

export function toMap<T>(
    collection: AwaitableIterable<T>
): Promise<AsMap<Iterable<T | Awaited<T>>>>;

export function toMap<T, V>(
    collection: AwaitableIterable<T>,
    keySelector: undefined,
    valueSelector: (item: T, index: number) => V
): Promise<AsMapWithValue<Iterable<T | Awaited<T>>, V | Awaited<V>>>;

export function toMap<T, K>(
    collection: AwaitableIterable<T>,
    keySelector: (item: T, index: number) => K
): Promise<AsMapWithKey<Iterable<T | Awaited<T>>, K | Awaited<K>>>;

export function toMap<T, K, V>(
    collection: AwaitableIterable<T>,
    keySelector: (item: T, index: number) => K,
    valueSelector: (item: T, index: number) => V
): Promise<Map<K | Awaited<K>, V | Awaited<V>>>;

export function toMap<
    T,
    K = T | Awaited<T> extends EntryLikeKey<infer K> ? K : unknown,
    V = T | Awaited<T> extends EntryLikeValue<infer V> ? V : unknown
>(
    collection: AwaitableIterable<T>,
    keySelector?: (item: T, index: number) => K,
    valueSelector?: (item: T, index: number) => V
): Map<K, V> | Promise<Map<K | Awaited<K>, V | Awaited<V>>>;

export function toMap(
    collection: AwaitableIterable<any>,
    keySelector: (item: any, index: number) => any = i => i?.[0],
    valueSelector: (item: any, index: number) => any = i => i?.[1]
): Map<any, any> | Promise<Map<any, any>> {
    if (isIterable(collection)) {
        const map = new Map<any, any>();

        let i = 0;
        for (const item of collection) {
            const key = keySelector(item, i);
            const value = valueSelector(item, i);

            map.set(key, value);

            i++;
        }

        return map;
    } else {
        return (async () => {
            const map = new Map<any, any>();

            let i = 0;
            for await (const item of collection) {
                const key = await keySelector(item, i);
                const value = await valueSelector(item, i);

                map.set(key, value);

                i++;
            }

            return map;
        })();
    }
}

export function asStandardCollection<T>(
    items: Iterable<T>
): ReadonlyStandardCollection<T>;
export function asStandardCollection<T>(
    items: AsyncIterable<T>
): Promise<ReadonlyStandardCollection<T>>;
export function asStandardCollection<T>(
    items: AwaitableIterable<T>
):
    | ReadonlyStandardCollection<T>
    | Promise<ReadonlyStandardCollection<Awaited<T>>>;

export function asStandardCollection<T>(
    items: AwaitableIterable<T>
):
    | ReadonlyStandardCollection<T>
    | Promise<ReadonlyStandardCollection<Awaited<T>>> {
    if (isStandardCollection(items)) {
        return items;
    }
    if (isIterable(items)) {
        return toArray;
    } else {
        return (async () => {
            const arr = new Set<Awaited<T>>();
            for await (const item of items) {
                arr.add(item);
            }
            return arr;
        })();
    }
}

export function groupBy<T, K, G, V>(
    collection: Iterable<T>,
    keySelector: (item: T, index: number) => K,
    groupSelector: (group: V[], key: K) => G,
    valueSelector: (item: T, index: number) => V
): Map<K, G>;

export function groupBy<T, K, G>(
    collection: Iterable<T>,
    keySelector: (item: T, index: number) => K,
    groupSelector: (group: T[], key: K) => G
): Map<K, G>;

export function groupBy<T, K, V>(
    collection: Iterable<T>,
    keySelector: (item: T, index: number) => K,
    groupSelector: undefined,
    valueSelector: (item: T, index: number) => V
): Map<K, V[]>;

export function groupBy<T, K, V>(
    collection: Iterable<T>,
    keySelector: (item: T, index: number) => K
): Map<K, T[]>;

export function groupBy<T, K, G, V>(
    collection: AsyncIterable<T>,
    keySelector: (item: Awaited<T>, index: number) => K,
    groupSelector: (group: Awaited<V>[], key: Awaited<K>) => G,
    valueSelector: (item: Awaited<T>, index: number) => V
): Promise<Map<Awaited<K>, Awaited<G>>>;

export function groupBy<T, K, G>(
    collection: AsyncIterable<T>,
    keySelector: (item: Awaited<T>, index: number) => K,
    groupSelector: (group: Awaited<T>[], key: Awaited<K>) => G
): Promise<Map<Awaited<K>, Awaited<G>>>;

export function groupBy<T, K, V>(
    collection: AsyncIterable<T>,
    keySelector: (item: Awaited<T>, index: number) => K,
    groupSelector: undefined,
    valueSelector: (item: Awaited<T>, index: number) => V
): Promise<Map<Awaited<K>, Awaited<V>[]>>;

export function groupBy<T, K>(
    collection: AsyncIterable<T>,
    keySelector: (item: Awaited<T>, index: number) => K
): Promise<Map<Awaited<K>, Awaited<T>[]>>;

export function groupBy(
    collection: AwaitableIterable<any>,
    keySelector: (item: any, index: number) => any,
    groupSelector?: (group: any[], key: any) => any,
    valueSelector?: (item: any, index: number) => any
): Awaitable<Map<any, any>>;

export function groupBy(
    collection: AwaitableIterable<any>,
    keySelector: (item: any, index: number) => any,
    groupSelector?: (group: any[], key: any) => any,
    valueSelector: (item: any, index: number) => any = identity
): Awaitable<Map<any, any>> {
    const groups = new Map<any, any>();
    let i = 0;
    if (isIterable(collection)) {
        for (const item of collection) {
            const key = keySelector(item, i);
            const value = valueSelector(item, i);
            const group = groups.get(key);

            if (group !== undefined) {
                group.push(value);
            } else {
                groups.set(key, [value]);
            }
            i++;
        }

        if (groupSelector !== undefined) {
            for (const entry of groups) {
                const key = entry[0];
                const group = entry[1];
                groups.set(key, groupSelector(group, key));
            }
        }

        return groups;
    } else {
        return (async () => {
            for await (const item of collection) {
                const key = await keySelector(item, i);
                const value = await valueSelector(item, i);
                const group = groups.get(key);

                if (group !== undefined) {
                    group.push(value);
                } else {
                    groups.set(key, [value]);
                }
                i++;
            }

            if (groupSelector !== undefined) {
                for (const entry of groups) {
                    const key = entry[0];
                    const group = entry[1];
                    groups.set(key, await groupSelector(group, key));
                }
            }

            return groups;
        })();
    }
}

export function nonIteratedCountOrUndefined(
    collection: Iterable<any>
): number | undefined {
    if (collection instanceof Array) return collection.length;
    if (collection instanceof Set) return collection.size;
    if (collection instanceof Map) return collection.size;
    if (collection instanceof Jstream)
        return collection.nonIteratedCountOrUndefined();
    return undefined;
}
