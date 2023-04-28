import { TstreamProperties } from "./Tstream";
import NeverEndingOperationError from "./errors/NeverEndingOperationError";
import { asyncForEach, getIterator } from "./privateUtils/async";
import { returns } from "./privateUtils/functional";
import { isAsyncIterable, isIterable } from "./privateUtils/typeGuards";
import { Awaitable, AwaitableIterable, AwaitableIterator } from "./types/async";
import { General } from "./types/literals";
import { BreakSignal } from "./types/symbols";
// TODO expensiveSource, insertAll, documentation
export type AsyncTstreamProperties<T> = TstreamProperties<T>;

export class AsyncTstream<T> implements AsyncIterable<T> {
    private readonly getSource: () => Awaitable<
        AwaitableIterable<T> | AwaitableIterator<T>
    >;
    private readonly properties: AsyncTstreamProperties<T>;

    public constructor(
        properties: AsyncTstreamProperties<T>,
        getSource: () => Awaitable<AwaitableIterable<T> | AwaitableIterator<T>>
    ) {
        this.getSource = getSource;
        this.properties = properties;
    }

    public readonly [Symbol.asyncIterator] = (): AsyncIterator<T> => {
        let iterator: AwaitableIterator<T> | undefined = undefined;
        return {
            next: async () => {
                if (iterator === undefined) {
                    const source = await this.getSource();
                    if (isIterable(source) || isAsyncIterable(source)) {
                        iterator = getIterator(source);
                    } else {
                        iterator = source;
                    }
                }
                return await iterator.next();
            },
        };
    };

    public static over<T>(
        source:
            | Awaitable<AwaitableIterable<T>>
            | (() => Awaitable<AwaitableIterable<T>>)
    ) {
        if (source instanceof Function) {
            return new AsyncTstream({ expensiveSource: true }, source);
        } else {
            return new AsyncTstream({}, returns(source));
        }
    }

    public static of<T>(...items: T[]): AsyncTstream<T> {
        return AsyncTstream.over(items);
    }

    public get forEach() {
        const self = this;
        return function (
            action: (item: T, index: number) => Awaitable<void | BreakSignal>
        ): Promise<void | BreakSignal> {
            return asyncForEach(self, action);
        };
    }

    public get map() {
        const self = this;
        return function map<R>(
            mapping: (item: T, index: number) => R
        ): AsyncTstream<R> {
            return new AsyncTstream({}, () => {
                let iterator: AsyncIterator<T> | undefined = undefined;
                let i = -1;
                return {
                    next: async () => {
                        if (iterator === undefined) {
                            iterator = self[Symbol.asyncIterator]();
                        }
                        i++;
                        const next = await iterator.next();
                        return {
                            done: next.done ?? false,
                            value: mapping(next.value, i),
                        };
                    },
                };
            });
        };
    }

    public get filter() {
        const self = this;
        return function filter<R extends T = T>(
            condition: (item: T, index: number) => Awaitable<boolean>
        ): AsyncTstream<R> {
            return new AsyncTstream({}, () => {
                let iterator: AsyncIterator<T> | undefined = undefined;
                let i = 0;
                return {
                    next: async (): Promise<IteratorResult<R>> => {
                        if (iterator === undefined) {
                            iterator = self[Symbol.asyncIterator]();
                        }

                        while (true) {
                            const next = await iterator.next();
                            if (next.done) {
                                return { done: true, value: undefined };
                            }
                            const item = next.value;
                            if (await condition(item, i)) {
                                return { done: false, value: item as R };
                            }
                            i++;
                        }
                    },
                };
            });
        };
    }

    public get takeWhile() {
        const self = this;
        return function (condition: (item: T, index: number) => Awaitable<boolean>) {
            return new AsyncTstream({}, () => {
                let iterator: AsyncIterator<T> | undefined;
                let i = 0;
                let done = false;
                return {
                    next: async () => {
                        if (done) return { done: true, value: undefined };
                        if (iterator === undefined) {
                            iterator = self[Symbol.asyncIterator]();
                        }

                        const next = await iterator.next();
                        if (next.done) return { done: true, value: undefined };
                        const item = next.value;

                        if (condition(item, i)) {
                            i++;
                            return { done: false, value: item };
                        } else {
                            i++;
                            return { done: true, value: undefined };
                        }
                    },
                };
            });
        };
    }

    public get skipWhile() {
        const self = this;
        return function (condition: (item: T, index: number) => Awaitable<boolean>) {
            return new AsyncTstream({}, () => {
                let iterator: AsyncIterator<T> | undefined;
                let i = 0;
                let done = false;
                return {
                    next: async () => {
                        if (done) return { done: true, value: undefined };
                        if (iterator === undefined) {
                            iterator = self[Symbol.asyncIterator]();
                        }

                        while(true){
                            const next = await iterator.next();
                            if (next.done) return { done: true, value: undefined };
                            const item = next.value;
                            
                            if (condition(item, i)) {
                                i++;
                                return { done: false, value: item };
                            } else {
                                i++;
                                return { done: true, value: undefined };
                            }
                        }
                        
                    },
                };
            });
        };
    }

    /**
     * Awaits all promises in the {@link AsyncTstream}.
     */
    public get await() {
        const self = this;
        return function await(): AsyncTstream<Awaited<T>> {
            return new AsyncTstream({}, async function* () {
                yield* self;
            });
        };
    }

    public get reduce(): {
        /**
         * Reduces the stream to a single value using the given reducer function.
         * This function is first called on the first two items in the stream like this: reducer(first, second, 1).
         * The index given corresponds to the second item given to the function.
         * Next the result of that call and the third item are given to the function: reducer(result, third, 2).
         * This continues until the final item: reducer(result, final, final index).
         * The result of that call is returned.
         *
         * If the stream only contains 1 item, that item is returned.
         *
         * If the stream contains no items, an Error is thrown.
         */
        (
            reducer: (
                result: General<T>,
                item: T,
                index: number
            ) => Awaitable<General<T>>
        ): Promise<General<T>>;

        /**
         * Reduces the stream to a single value in the same way as {@link Tstream.reduce}.
         * The difference is that the given finalize function is called on the result.
         * The result of this function is returned instead of the original result.
         * @param finalize Applied to the result and the number of items in the stream. The result of this is what gets returned.
         */
        <F>(
            reducer: (
                result: General<T>,
                item: T,
                index: number
            ) => Awaitable<General<T>>,
            finalize: (result: General<T>, count: number) => F
        ): Promise<Awaited<F>>;
    } {
        return async <F>(
            reducer: (
                result: General<T>,
                item: T,
                index: number
            ) => Awaitable<General<T>>,
            finalize?: (result: General<T>, count: number) => F
        ): Promise<General<T> | Awaited<F>> => {
            if (this.properties.infinite) {
                throw new NeverEndingOperationError(
                    "cannot reduce infinite items"
                );
            }
            const iterator = this[Symbol.asyncIterator]();
            let next = await iterator.next();

            // TODO maybe just return undefined instead
            if (next.done) {
                throw new Error(
                    "cannot reduce empty iterable. no initial value"
                );
            }

            let result: General<T> = next.value as General<T>;

            let i = 1;
            while (!(next = await iterator.next()).done) {
                result = await reducer(result, next.value, i);

                i++;
            }

            if (finalize !== undefined) {
                return await finalize(result, i);
            } else {
                return await result;
            }
        };
    }

    public get fold(): {
        /**
         * Reduces the stream in the same way as {@link Tstream.reduce}.
         * The difference is the given initialValue is used in place of the first value in the fist call to the given reducer function:
         * reducer(initialValue, first, 0). The index given corresponding to the item given to the function.
         * Unlike {@link Tstream.reduce}, an Error isn't thrown in the case of an empty stream. The initial value is returned instead.
         */
        <R>(
            initialValue: R,
            reducer: (result: R, item: T, index: number) => Awaitable<R>
        ): Promise<Awaited<R>>;

        /**
         * Reduces the stream in the same way as {@link Tstream.fold}.
         * The difference is that the given finalize function is called on the result.
         * The result of this function is returned instead of the original result.
         * @param finalize Applied to the result and the number of items in the stream;
         * this count only includes values from the stream, it does not include the initial
         * value given to the function. The result of this is what gets returned.
         */
        <R, F>(
            initialValue: R,
            reducer: (result: R, item: T, index: number) => Awaitable<R>,
            finalize: (result: R, count: number) => F
        ): Promise<Awaited<F>>;
    } {
        return async <R, F = R>(
            initialValue: R,
            reducer: (result: R, item: T, index: number) => R,
            finalize?: (result: R, count: number) => F
        ): Promise<Awaited<F | R>> => {
            if (this.properties.infinite) {
                throw new NeverEndingOperationError(
                    "cannot fold infinite items"
                );
            }
            let result: R | Awaited<R> = initialValue;

            let i = 0;
            const iterator = this[Symbol.asyncIterator]();
            for (
                let next = await iterator.next();
                !next.done;
                next = await iterator.next()
            ) {
                result = await reducer(result, next.value, i);
                i++;
            }

            if (finalize !== undefined) {
                return await finalize(result, i);
            } else {
                return await result;
            }
        };
    }

    /**
     * @returns An array of the items in the {@link AsyncTstream}.
     */
    public get toArray() {
        const self = this;
        return async function toArray(): Promise<T[]> {
            const array: T[] = [];
            await asyncForEach(self, item => {
                array.push(item);
            });
            return array;
        };
    }

    /**
     * @returns A set of the items in the {@link AsyncTstream}.
     */
    public get toSet() {
        const self = this;
        return async function toSet(): Promise<Set<T>> {
            const set = new Set<T>();
            await asyncForEach(self, item => {
                set.add(item);
            });
            return set;
        };
    }
}
