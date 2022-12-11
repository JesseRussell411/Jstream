import { isAsyncIterable } from "./typeGuards";

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

export function toArray<T>(items: AsyncIterable<T>): Promise<Awaited<T>[]>;
export function toArray<T>(items: Iterable<T>): T[];
export function toArray<T>(
    items: Iterable<T> | AsyncIterable<T>
): T[] | Promise<Awaited<T>[]>;
export function toArray<T>(
    items: Iterable<T> | AsyncIterable<T>
): T[] | Promise<Awaited<T>[]> {
    if (isAsyncIterable(items)) {
        return (async () => {
            const arr: Awaited<T>[] = [];
            for await (const item of items) {
                arr.push(item);
            }
            return arr;
        })();
    } else {
        return [...items];
    }
}

export function toSet<T>(items: AsyncIterable<T>): Promise<Set<Awaited<T>>>;
export function toSet<T>(items: Iterable<T>): Set<T>;
export function toSet<T>(
    items: Iterable<T> | AsyncIterable<T>
): Set<T> | Promise<Set<Awaited<T>>>;
export function toSet<T>(
    items: Iterable<T> | AsyncIterable<T>
): Set<T> | Promise<Set<Awaited<T>>> {
    if (isAsyncIterable(items)) {
        return (async () => {
            const arr = new Set<Awaited<T>>();
            for await (const item of items) {
                arr.add(item);
            }
            return arr;
        })();
    } else {
        return new Set(items);
    }
}
