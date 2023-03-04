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


export function iterableFromIterator<T>(iterator: Iterator<T>): Iterable<T>{
    let returnedIterator = iterator;
    return {
        [Symbol.iterator](){
            const result = returnedIterator;
            returnedIterator = emptyIterator<T>();
            return result;
        }
    }
}

export function lazyIterable<T>(iterableGetter: () => Iterable<T>): Iterable<T> {
    return iterableFromIteratorGetter(() => iterableGetter()[Symbol.iterator]());
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
    end: bigint,
    step: bigint
): Iterable<bigint>;
/** A clone of python's range function */
export function range(start: bigint, end: bigint): Iterable<bigint>;
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
export function range(end: number | bigint): Iterable<number>;

/** A clone of python's range function */
export function range(
    _startOrEnd: number | bigint,
    _end?: number | bigint,
    _step?: number | bigint
): any {
    const useNumber =
        typeof _startOrEnd === "number" ||
        typeof _end === "number" ||
        typeof _step === "number";

    const ZERO = useNumber ? 0 : (0n as any);
    const ONE = useNumber ? 1 : (1n as any);

    let start: any;
    let end: any;
    let step: any;
    if (_step !== undefined) {
        start = _startOrEnd;
        end = _end;
        step = _step;
    } else if (_end !== undefined) {
        start = _startOrEnd;
        end = _end;
        step = ONE;
    } else {
        start = ZERO;
        end = _startOrEnd;
        step = ONE;
    }

    if (useNumber) {
        start = Number(start);
        end = Number(end);
        step = Number(step);
    }

    if (step === ZERO) throw new Error("arg3 must not be zero");

    if (step < ZERO && start < end) return emptyIterable();
    if (step > ZERO && start > end) return emptyIterable();

    const test = step > ZERO ? (i: any) => i < end : (i: any) => i > end;

    return iterableFromIteratorGetter(function* () {
        for (let i = start; test(i); i += step) yield i;
    });
}
