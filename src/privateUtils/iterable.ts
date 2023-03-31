import { AwaitableIterable } from "../types/async";

/**
 * @returns An iterable over the iterator from the given function. Unlike Generators, this can be iterated more than once.
 */
export function iterableFromIteratorGetter<T>(
    iteratorGetter: () => Iterator<T>
): Iterable<T> {
    return {
        [Symbol.iterator]: iteratorGetter,
    };
}

export function iterableFromIterator<T>(iterator: Iterator<T>): Iterable<T> {
    let returnedIterator = iterator;
    return {
        [Symbol.iterator]() {
            const result = returnedIterator;
            returnedIterator = emptyIterator<T>();
            return result;
        },
    };
}

export function lazyIterable<T>(
    iterableGetter: () => Iterable<T>
): Iterable<T> {
    return iterableFromIteratorGetter(() =>
        iterableGetter()[Symbol.iterator]()
    );
}

const _emptyIterator: Iterator<any> = {
    next(): IteratorResult<any> {
        return { done: true, value: undefined };
    },
};

const _emptyAsyncIterator: AsyncIterator<any> = {
    next(): Promise<IteratorResult<any>> {
        return Promise.resolve({ done: true, value: undefined });
    },
};

const _emptyIterable: AwaitableIterable<any> = {
    [Symbol.iterator]() {
        return _emptyIterator;
    },

    [Symbol.asyncIterator]() {
        return _emptyAsyncIterator;
    },
};

export function emptyIterable<T = any>(): AwaitableIterable<T> {
    return _emptyIterable;
}

export function emptyIterator<T = any>(): Iterator<T> {
    return _emptyIterator;
}

export function emptyAsyncIterator<T = any>(): AsyncIterator<T> {
    return _emptyAsyncIterator;
}

/** A clone of python's range function */
export function range(
    start: bigint,
    end: bigint | number,
    step: bigint
): Iterable<bigint>;
/** A clone of python's range function */
export function range(start: bigint, end: bigint | number): Iterable<bigint>;
/** A clone of python's range function */
export function range(end: bigint): Iterable<bigint>;
/** A clone of python's range function */
export function range(
    start: number | bigint,
    end: number | bigint,
    step: number | bigint
): Iterable<number>;
/** A clone of python's range function */
export function range(
    start: number | bigint,
    end: number | bigint
): Iterable<number>;
/** A clone of python's range function */
export function range(end: number): Iterable<number>;

/** A clone of python's range function */
export function range(
    ...args:
        | [end: number | bigint]
        | [start: number | bigint, end: number | bigint]
        | [start: number | bigint, end: number | bigint, step: number | bigint]
): Iterable<number> | Iterable<bigint> {
    if ((args.length as number) === 0)
        throw new Error("expected at least one argument but got 0");

    let [start = 0n, end, step = 1n] =
        args.length === 1 ? [undefined, args[0]] : args;

    // use numbers if either start or step are numbers or if only end was given and end isn't a bigint
    if (
        typeof start === "number" ||
        typeof end === "number" ||
        (args.length === 1 && typeof end === "number")
    ) {
        start = Number(start);
        end = Number(end);
        step = Number(step);
    }

    const test = step > 0 ? (i: any) => i < end : (i: any) => i > end;

    return iterableFromIteratorGetter(function* () {
        for (let i = start; test(i); i += step as any) yield i as any;
    });
}
