import { BreakSignal } from "../types/symbols";
import { breakSignal } from "../symbols/symbols";
import { doNothing } from "./functional";
import {
    Awaitable,
    AwaitableIterable,
    AwaitableIterator,
} from "../types/async";
import { isIterable } from "./typeGuards";

/**
 * A {@link Promise} with exposed resolve and reject methods.
 */
export class Deferred<T> extends Promise<T> {
    private _resolve: (value: T | PromiseLike<T>) => void = doNothing;
    private _reject: (reason?: any) => void = doNothing;

    public get resolve(): (value: T | PromiseLike<T>) => void {
        return this._resolve;
    }

    public get reject(): (reason?: any) => void {
        return this._reject;
    }

    /**
     * A promise that shadows this {@link Deferred}. It is resolved when this {@link Deferred} is resolved and rejected when this {@link Deferred} is rejected. Crucially, it can't be casted up to a Deferred, enforcing the usual limitation of {@link Promise Promises} which is that they can't be resolved or rejected directly.
     */
    public get shadow(): Promise<T> {
        return new Promise((resolve, reject) => {
            this.then(resolve);
            this.catch(reject);
        });
    }

    public constructor(
        executer?: (
            resolve: (value: T | PromiseLike<T>) => void,
            reject: (reason?: any) => void
        ) => void
    ) {
        super((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
            executer?.(resolve, reject);
        });
    }
}

export function getIterator<T>(iterable: Iterable<T>): Iterator<T>;
export function getIterator<T>(iterable: AsyncIterable<T>): AsyncIterator<T>;
export function getIterator<T>(
    iterable: AwaitableIterable<T>
): AwaitableIterator<T>;
export function getIterator<T>(
    iterable: AwaitableIterable<T>
): AwaitableIterator<T> {
    if (isIterable(iterable)) {
        return iterable[Symbol.iterator]();
    } else {
        return iterable[Symbol.asyncIterator]();
    }
}
export async function asyncForEach<T>(
    iterable: AwaitableIterable<T>,
    action: (item: T, index: number) => Awaitable<void | BreakSignal>
): Promise<void | BreakSignal> {
    const iterator = getIterator(iterable);
    let i = 0;
    for (
        let next = await iterator.next();
        !next.done;
        next = await iterator.next()
    ) {
        const signal = await action(next.value, i);
        if (signal === breakSignal) return signal;
        i++;
    }
}
