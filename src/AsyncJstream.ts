import { asyncForEach, getIterator } from "./privateUtils/async";
import { returns } from "./privateUtils/functional";
import { isAsyncIterable, isIterable } from "./privateUtils/typeGuards";
import { Awaitable, AwaitableIterable, AwaitableIterator } from "./types/async";
import { BreakSignal } from "./types/symbols";
// TODO expensiveSource, insertAll, documentation
export type AsyncJstreamProperties<_> = Partial<
    Readonly<{
        /** Each call to the source getter produces a new copy of the source. This means that the source can be modified safely, assuming it is a mutable collection like {@link Array}, which is not guarantied. */
        freshSource: boolean;
        /** Calling the source getter is expensive, ie. it's more than an O(1) operation. */
        expensiveSource: boolean;
    }>
>;

export default class AsyncJstream<T> implements AsyncIterable<T> {
    private readonly getSource: () => Awaitable<
        AwaitableIterable<T> | AwaitableIterator<T>
    >;
    private readonly properties: AsyncJstreamProperties<T>;

    public constructor(
        properties: AsyncJstreamProperties<T>,
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
            return new AsyncJstream({ expensiveSource: true }, source);
        } else {
            return new AsyncJstream({}, returns(source));
        }
    }

    public static of<T>(...items: T[]): AsyncJstream<T> {
        return AsyncJstream.over(items);
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
        ): AsyncJstream<R> {
            return new AsyncJstream({}, () => {
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
            condition: (item: T, index: number) => boolean
        ): AsyncJstream<R> {
            return new AsyncJstream({}, () => {
                let iterator: AsyncIterator<T> | undefined = undefined;
                let i = -1;
                return {
                    next: async (): Promise<IteratorResult<R>> => {
                        if (iterator === undefined) {
                            iterator = self[Symbol.asyncIterator]();
                        }

                        let next: IteratorResult<T>;
                        let item: T;
                        do {
                            i++;
                            next = await iterator.next();
                            if (next.done)
                                return { done: true, value: undefined };
                            item = next.value;
                        } while (!condition(item, i));

                        return { done: false, value: item as R };
                    },
                };
            });
        };
    }

    // TODO reduce and fold

    /**
     * Awaits all promises in the {@link AsyncJstream}.
     */
    public get await() {
        const self = this;
        return function await(): AsyncJstream<Awaited<T>> {
            return new AsyncJstream({}, async function* () {
                yield* self;
            });
        };
    }

    /**
     * @returns An array of the items in the {@link AsyncJstream}.
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
     * @returns A set of the items in the {@link AsyncJstream}.
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
