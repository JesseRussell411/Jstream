import Jstream from "../Jstream";
import { asComparator, smartComparator } from "../sorting/sorting";
import { AwaitableIterable, AwaitableIterator } from "../types/async";
import {
    AsMap,
    AsMapWithKey,
    AsMapWithValue,
    EntryLikeKey,
    EntryLikeValue,
    ReadonlyStandardCollection,
    StandardCollection,
} from "../types/collections";
import { Order } from "../types/sorting";
import { asyncForEach, getIterator } from "./async";
import { requireGreaterThanZero, requireSafeInteger } from "./errorGuards";
import { iterableFromIteratorGetter } from "./iterable";
import { isIterable } from "./typeGuards";

/**
 * @returns An Iterable that caches it's output so that subsequent iterations pull from the cache instead of the original.
 */
export function asyncMemoizeIterable<T>(
    iterable: AwaitableIterable<T>
): AsyncIterable<T> {
    const cache: T[] = [];
    let iterator: AwaitableIterator<T> | undefined = undefined;

    return {
        async *[Symbol.asyncIterator]() {
            if (iterator === undefined) {
                iterator = getIterator(iterable);
            }

            let i = 0;
            while (true) {
                if (i < cache.length) {
                    yield cache[i] as Promise<T>;
                } else {
                    const next = await iterator.next();

                    if (next.done) break;

                    const value = next.value;

                    cache.push(value);

                    yield value;
                }
                i++;
            }
        },
    };
}

/**
 * @returns An Iterable that caches it's output so that subsequent iterations pull from the cache instead of the original.
 */
export function memoizeIterable<T>(iterable: Iterable<T>): Iterable<T> {
    const cache: T[] = [];
    let iterator: Iterator<T> | undefined = undefined;

    return iterableFromIteratorGetter(function* () {
        if (iterator === undefined) {
            iterator = iterable[Symbol.iterator]();
        }

        let i = 0;

        while (true) {
            if (i < cache.length) {
                yield cache[i] as T;
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
}

/**
 * In-place Fisher-Yates shuffle of the given array.
 * Uses {@link Math.random}.
 * @param array What to shuffle.
 * @param getRandomInt Returns a random integer between 0 (inclusive) and max (exclusive).
 */
export function fisherYatesShuffle(
    array: any[],
    getRandomInt: (max: number) => number = max =>
        Math.trunc(Math.random() * max)
): void {
    for (let i = array.length - 1; i > 0; i--) {
        const j = getRandomInt(i + 1);

        const temp = array[i]!;
        array[i] = array[j]!;
        array[j] = temp;
    }
}

export async function asyncToArray<T>(
    items: AwaitableIterable<T>
): Promise<T[]> {
    const result: T[] = [];
    await asyncForEach(items, item => {
        result.push(item);
    });
    return result;
}

export function toArray<T>(items: Iterable<T>): T[];

export function toArray<T>(items: Iterable<T>): T[] {
    if (items instanceof Jstream){
        return items.toArray();
    }
    return [...items];
}

export async function asyncToSet<T>(
    items: AwaitableIterable<T>
): Promise<Set<T>> {
    const result = new Set<T>();
    await asyncForEach(items, item => {
        result.add(item);
    });
    return result;
}

export function toSet<T>(items: Iterable<T>): Set<T> {
    return new Set(items);
}

export function asyncToMap<T>(
    collection: AwaitableIterable<T>
): Promise<AsMap<Iterable<Awaited<T>>>>;

export function asyncToMap<T, V>(
    collection: AwaitableIterable<T>,
    keySelector: undefined,
    valueSelector: (item: T, index: number) => V
): Promise<AsMapWithValue<Iterable<Awaited<T>>, Awaited<V>>>;

export function asyncToMap<T, K>(
    collection: AwaitableIterable<T>,
    keySelector: (item: T, index: number) => K
): Promise<AsMapWithKey<Iterable<Awaited<T>>, Awaited<K>>>;

export function asyncToMap<T, K, V>(
    collection: AwaitableIterable<T>,
    keySelector: (item: T, index: number) => K,
    valueSelector: (item: T, index: number) => V
): Promise<Map<Awaited<K>, Awaited<V>>>;

export function asyncToMap<
    T,
    K = T extends EntryLikeKey<infer K> ? K : unknown,
    V = T extends EntryLikeValue<infer V> ? V : unknown
>(
    collection: AwaitableIterable<T>,
    keySelector?: (item: T, index: number) => K,
    valueSelector?: (item: T, index: number) => V
): Promise<Map<K, V>>;

export function asyncToMap<T>(
    collection: AwaitableIterable<T>
): Promise<AsMap<Iterable<T>>>;

export function asyncToMap<T, V>(
    collection: AwaitableIterable<T>,
    keySelector: undefined,
    valueSelector: (item: T, index: number) => V
): Promise<AsMapWithValue<Iterable<T>, V>>;

export function asyncToMap<T, K>(
    collection: AwaitableIterable<T>,
    keySelector: (item: T, index: number) => K
): Promise<AsMapWithKey<Iterable<T>, K>>;

export function asyncToMap<T, K, V>(
    collection: AwaitableIterable<T>,
    keySelector: (item: T, index: number) => K,
    valueSelector: (item: T, index: number) => V
): Promise<Map<K, V>>;

export function asyncToMap(
    collection: AwaitableIterable<any>,
    keySelector: (item: any, index: number) => any = i => i?.[0],
    valueSelector: (item: any, index: number) => any = i => i?.[1]
): Promise<Map<any, any>> {
    return (async () => {
        const map = new Map<any, any>();

        await asyncForEach(collection, async (item, i) => {
            const key = await keySelector(item, i);
            const value = await valueSelector(item, i);

            map.set(key, value);

            i++;
        });
        return map;
    })();
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

export function toMap(
    collection: Iterable<any>,
    keySelector: (item: any, index: number) => any = i => i?.[0],
    valueSelector: (item: any, index: number) => any = i => i?.[1]
): Map<any, any> {
    const map = new Map<any, any>();

    let i = 0;
    for (const item of collection) {
        const key = keySelector(item, i);
        const value = valueSelector(item, i);

        map.set(key, value);

        i++;
    }

    return map;
}

export function nonIteratedCount(
    collection: ReadonlyStandardCollection<any> | StandardCollection<any>
): number {
    if (Array.isArray(collection)) return collection.length;
    return (collection as any).size;
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
    order: Order<T> = smartComparator
) {
    requireGreaterThanZero(requireSafeInteger(count));
    const STRATEGY_COUNT_THRESHOLD = 10;

    const comparator = asComparator(order);

    if (count > STRATEGY_COUNT_THRESHOLD) {
        const itemsLength = nonIteratedCountOrUndefined(items);
        if (itemsLength !== undefined && count > Math.sqrt(itemsLength)) {
            const result = [...items];
            result.sort(comparator);
            return result.slice(0, Number(count));
        }
    }

    const result: T[] = [];

    for (const item of items) {
        let insertionFlag = false;

        for (let i = 0; i < result.length; i++) {
            if (comparator(item, result[i] as T) < 0) {
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
}

export async function asyncMin<T>(
    items: AwaitableIterable<T>,
    count: number | bigint,
    order: Order<T> = smartComparator
): Promise<T[]> {
    requireGreaterThanZero(requireSafeInteger(count));
    const STRATEGY_COUNT_THRESHOLD = 10;

    const comparator = asComparator(order);

    if (isIterable(items) && count > STRATEGY_COUNT_THRESHOLD) {
        const itemsLength = nonIteratedCountOrUndefined(items);
        if (itemsLength !== undefined && count > Math.sqrt(itemsLength)) {
            const result = [...items];
            result.sort(comparator);
            return result.slice(0, Number(count));
        }
    }

    const result: T[] = [];

    await asyncForEach(items, item => {
        let insertionFlag = false;

        for (let i = 0; i < result.length; i++) {
            if (comparator(item, result[i] as T) < 0) {
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
    });

    return result;
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
        const delim = [...deliminator];
        const delimLength = delim.length;

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

export function groupBy<T, K>(
    items: Iterable<T>,
    keySelector: (item: T, index: number) => K
): Map<K, T[]>;
export function groupBy<T, K, G>(
    items: Iterable<T>,
    keySelector: (item: T, index: number) => K,
    groupSelector: (group: T[], key: K) => G
): Map<K, G>;
export function groupBy<T, K>(
    items: Iterable<T>,
    keySelector: (item: T, index: number) => K,
    groupSelector?: (group: T[], key: K) => any
): Map<K, any> {
    const groups = new Map<K, any>();
    let i = 0;
    for (const item of items) {
        const key = keySelector(item, i);

        const group = groups.get(key);
        if (group !== undefined) {
            group.push(item);
        } else {
            groups.set(key, [item]);
        }

        i++;
    }

    if (groupSelector !== undefined) {
        for (const [key, group] of groups) {
            groups.set(key, groupSelector(group, key));
        }
    }

    return groups;
}
