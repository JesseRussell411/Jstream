import AsyncJstream from "../AsyncJstream";
import Jstream from "../Jstream";
import { asComparator, smartComparator } from "../sorting/sorting";
import { Awaitable, AwaitableIterable } from "../types/async";
import {
    AsMap,
    AsMapWithKey,
    AsMapWithValue,
    EntryLikeKey,
    EntryLikeValue,
    ReadonlyStandardCollection,
    StandardCollection
} from "../types/collections";
import { Order } from "../types/sorting";
import { requireGreaterThanZero, requireSafeInteger } from "./errorGuards";
import { identity } from "./functional";
import { iterableFromIteratorGetter } from "./iterable";
import { isArray, isIterable, isStandardCollection } from "./typeGuards";

/**
 * @returns An Iterable that caches it's output so that subsequent iterations pull from the cache instead of the original.
 */
export function memoizeIterable<T>(iterable: Iterable<T>): Iterable<T>;
/**
 * @returns An Iterable that caches it's output so that subsequent iterations pull from the cache instead of the original.
 */
export function memoizeIterable<T>(
    iterable: AsyncIterable<T>
): AsyncIterable<T>;
export function memoizeIterable<T>(
    iterable: AwaitableIterable<T>
): AwaitableIterable<T> {
    if (isIterable(iterable)) {
        const cache: T[] = [];
        let iterator: Iterator<T> | undefined = undefined;
        return iterableFromIteratorGetter(function* () {
            if (iterator === undefined) {
                iterator = iterable[Symbol.iterator]();
            }

            let i = 0;

            while (true) {
                if (i < cache.length) {
                    yield cache[i]!;
                } else {
                    const next = iterator.next();
                    if (next.done) break;
                    const value = next.value;
                    cache.push(value);
                    yield value;
                }
                i++;
            }
        });
    } else {
        const cache: Awaited<T>[] = [];
        let iterator: AsyncIterator<T> | undefined = undefined;

        return {
            async *[Symbol.asyncIterator]() {
                if (iterator === undefined) {
                    iterator = iterable[Symbol.asyncIterator]();
                }

                let i = 0;
                while (true) {
                    if (i < cache.length) {
                        yield cache[i]!;
                    } else {
                        const next = await iterator.next();
                        if (next.done) break;
                        const value = await next.value;
                        cache.push(value);
                        yield value;
                    }
                }
            },
        };
    }
}

/**
 * In-place Fisher-Yates shuffle of the given array.
 * Uses {@link Math.random}.
 */
export function fisherYatesShuffle(array: any[]): void {
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
        return toArray(items);
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

export function nonIteratedCount(
    collection: ReadonlyStandardCollection<any> | StandardCollection<any>
): number {
    if (Array.isArray(collection)) return collection.length;
    return (collection as any).size;
}

export function asArray<T>(collection: Iterable<T>): readonly T[];

export function asArray<T>(collection: AsyncIterable<T>): Promise<readonly T[]>;

export function asArray<T>(
    collection: AwaitableIterable<T>
): Awaitable<readonly T[]> {
    if (isArray(collection)) {
        return collection;
    } else {
        return toArray(collection);
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

export function min<T>(
    items: Iterable<T>,
    count: number | bigint,
    order?: Order<T>
): T[];

export function min<T>(
    items: AsyncIterable<T>,
    count: number | bigint,
    order?: Order<T>
): Promise<T[]>;

export function min<T>(
    items: AwaitableIterable<T>,
    count: number | bigint,
    order: Order<T> = smartComparator
): Awaitable<T[]> {
    requireGreaterThanZero(requireSafeInteger(count));

    const comparator = asComparator(order);

    if (isIterable(items)) {
        const itemsLength = nonIteratedCountOrUndefined(items);
        if (itemsLength !== undefined && count > Math.sqrt(itemsLength)) {
            const result = [...items];
            result.sort(comparator);
            return result.slice(0, Number(count));
        }

        const result: T[] = [];

        for (const item of items) {
            let insertionFlag = false;

            for (let i = 0; i < result.length; i++) {
                if (comparator(item, result[i]!) < 0) {
                    insertionFlag = true;

                    if (result.length < count) {
                        result.length += 1;
                    }
                    result.copyWithin(i + 1, i, result.length);

                    result[i] = item;
                    break;
                }
            }

            if (result.length < count && insertionFlag === false) {
                result.push(item);
            }
        }

        return result;
    } else {
        if (items instanceof AsyncJstream) {
            const nonAsync = items.nonAsyncIterableOrUndefined();
            if (nonAsync !== undefined) {
                return Promise.resolve(min(nonAsync, count, order));
            }
        }

        return (async () => {
            const itemsLength =
                items instanceof AsyncJstream
                    ? await items.nonIteratedCountOrUndefined()
                    : undefined;

            if (itemsLength !== undefined && count > Math.sqrt(itemsLength)) {
                const result = await toArray(items);
                result.sort(comparator);
                return result.slice(0, Number(count));
            }

            const result: T[] = [];

            for await (const item of items) {
                let insertionFlag = false;

                for (let i = 0; i < result.length; i++) {
                    if (comparator(item, result[i]!) < 0) {
                        insertionFlag = true;

                        if (result.length < count) {
                            result.length += 1;
                        }
                        result.copyWithin(i + 1, i, result.length);

                        result[i] = item;
                        break;
                    }
                }

                if (result.length < count && insertionFlag === false) {
                    result.push(item);
                }
            }

            return result;
        })();
    }
}

/**
 * Splits the collection on the deliminator.
 * Equivalent to {@link String.split} except that regular expressions aren't supported.
 */
export function split<T, O>(
    collection: Iterable<T>,
    deliminator: Iterable<O>,
    equalityChecker: (t: T, o: O) => boolean = Object.is
): Iterable<T[]> {
    return iterableFromIteratorGetter(function* () {
        const delim = asStandardCollection(deliminator);
        const delimLength = nonIteratedCount(delim);

        let chunk: T[] = [];

        let delimIter = delim[Symbol.iterator]();
        let next = delimIter.next();
        for (const value of collection) {
            if (equalityChecker(value, next.value)) {
                next = delimIter.next();
            } else {
                delimIter = delim[Symbol.iterator]();
                next = delimIter.next();
            }

            if (next.done) {
                // remove delim from chunk
                chunk.splice(chunk.length - delimLength + 1, delimLength - 1);
                chunk.length -= delimLength;

                // reset deliminator iterator
                delimIter = delim[Symbol.iterator]();
                next = delimIter.next();

                // yield and reset chunk
                yield chunk;
                chunk = [];
            } else {
                chunk.push(value);
            }
        }
        yield chunk;
    });
}
