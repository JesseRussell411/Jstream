import { AsyncDeferredValue, isAsyncIterable, isIterable } from "./type";

// TODO docs
export type AsyncIteratorSource<T> = AsyncDeferredValue<
    AsyncIterator<T> | Iterator<T> | AsyncIterable<T> | Iterable<T>
>;

// TODO docs
export function asyncIterator<T>(
    source: AsyncIteratorSource<T>
): AsyncIterator<T> {
    if (isAsyncIterable(source)) {
        return source[Symbol.asyncIterator]();
    }

    return (async function* () {
        let iterator: Iterator<T> | AsyncIterator<T>;
        if (isIterable(source)) {
            iterator = source[Symbol.iterator]();
        } else if (typeof source === "function") {
            iterator = asyncIterator(await source());
        } else if (source instanceof Promise) {
            iterator = asyncIterator(await source);
        } else {
            iterator = source;
        }

        let next: IteratorResult<T>;
        while (!(next = await iterator.next()).done) {
            yield next.value;
        }
    })();
}

// TODO docs
export function asyncIterable<T>(
    source: AsyncIteratorSource<T>
): AsyncIterable<T> {
    if (isAsyncIterable(source)) {
        return source;
    } else {
        return {
            [Symbol.asyncIterator]() {
                return asyncIterator(source);
            },
        };
    }
}

