import {
    DeferredValue, extractDeferredValue, isIterable
} from "./type";

// TODO docs
export type IteratorSource<T> = DeferredValue<Iterator<T> | Iterable<T>>;

// TODO docs
export function iterator<T>(source: IteratorSource<T>): Iterator<T> {
    if (isIterable(source)) {
        return source[Symbol.iterator]();
    } else if (typeof source === "function") {
        return iterator(source());
    } else {
        return source;
    }
}

// TODO docs
export function iterable<T>(source: IteratorSource<T>): Iterable<T> {
    if (isIterable(source)) {
        return source;
    } else {
        return {
            [Symbol.iterator]() {
                return iterator(source);
            },
        };
    }
}


export function couldBeGenerator<T>(source: IteratorSource<T>): boolean {
    const extracted = extractDeferredValue(source);
    return typeof (extracted as any)?.next === "function" && isIterable(source);
}
