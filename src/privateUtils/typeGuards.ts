import { AwaitableIterable } from "../types/async";
import { StandardCollection } from "../types/collections";

export function isAsyncIterable<T>(
    item: AwaitableIterable<T>
): item is AsyncIterable<T> {
    return (item as any)?.[Symbol.asyncIterator] instanceof Function;
}

export function isIterable<T>(item: AwaitableIterable<T>): item is Iterable<T> {
    return (item as any)?.[Symbol.iterator] instanceof Function;
}

export function isArray<T>(item: AwaitableIterable<T>): item is T[];
export function isArray(item: any): item is unknown[];
export function isArray(item: any): item is unknown[] {
    return Array.isArray(item);
}

export function isSet<T>(item: AwaitableIterable<T> | any): item is Set<T>;
export function isSet(item: any): item is Set<unknown>;
export function isSet(item: any): item is Set<unknown> {
    return item instanceof Set;
}

export function isStandardCollection<T>(
    item:
        | AwaitableIterable<T>
        | (T extends [infer K, infer V] ? AwaitableIterable<[K, V]> : never)
): item is StandardCollection<T>;

export function isStandardCollection(
    item: any
): item is StandardCollection<unknown>;

export function isStandardCollection(
    item: any
): item is StandardCollection<unknown> {
    return Array.isArray(item) || item instanceof Set || item instanceof Map;
}
