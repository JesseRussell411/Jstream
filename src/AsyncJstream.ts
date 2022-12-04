import { Awaitable } from "./types/async";
import { DeLiteral } from "./types/utility";
import { breakSignal, BreakSignal } from "./utils/symbols";

export type AsyncJstreamProperties<_> = Readonly<
    Partial<{
        freshSource: boolean;
    }>
>;

export default class AsyncJstream<T> implements AsyncIterable<T> {
    private readonly getSource: () => Awaitable<AsyncIterable<T>>;
    private readonly properties: AsyncJstreamProperties<T>;

    public constructor(
        getSource: () => Awaitable<AsyncIterable<T>>,
        properties: AsyncJstreamProperties<T> = {}
    ) {
        this.getSource = getSource;
        this.properties = properties;
    }

    public [Symbol.asyncIterator]() {
        const self = this;
        return (async function* () {
            const source = await self.getSource();
            yield* source;
        })();
    }

    // factories:
    public static from<T>(
        source:
            | Awaitable<AsyncIterable<T> | Iterable<T>>
            | (() => Awaitable<AsyncIterable<T> | Iterable<T>>)
    ) {
        if (source instanceof Function) {
            return new AsyncJstream(async function* () {
                for await (const item of await source()) {
                    yield item;
                }
            });
        } else {
            return new AsyncJstream(async function* () {
                for await (const item of await source) {
                    yield item;
                }
            });
        }
    }

    public static of<AwaitableT>(
        ...items: readonly AwaitableT[]
    ): AsyncJstream<Awaited<AwaitableT>> {
        return new AsyncJstream(async function* () {
            for (const item of items) {
                yield await item;
            }
        });
    }

    public async forEach(
        action: (item: T, index: number) => void | Awaitable<BreakSignal>
    ): Promise<void> {
        let i = 0;
        for await (const item of this) {
            const signal = await action(item, i);

            if (signal === breakSignal) break;

            i++;
        }
    }

    // stream methods
    public map<AwaitableResult>(
        mapping: (item: T, index: number) => AwaitableResult
    ): AsyncJstream<Awaited<AwaitableResult>> {
        const self = this;
        return new AsyncJstream(async function* () {
            let i = 0;
            for await (const item of self) {
                yield await mapping(item, i);
                i++;
            }
        });
    }

    public filter<R extends T = T>(
        predicate: (item: T, index: number) => Awaitable<boolean>
    ): AsyncJstream<R> {
        const self = this;
        return new AsyncJstream(async function* () {
            let i = 0;
            for await (const item of self) {
                if (await predicate(item, i)) yield item as R;
                i++;
            }
        });
    }

    /**
     * Removes duplicate items from the stream.
     */
    public unique(): AsyncJstream<T>;

    /**
     * Removes duplicate items from the stream
     * @param identifier How to identify the item.
     */
    public unique(identifier: (item: T) => Awaitable<any>): AsyncJstream<T>;

    public unique(
        identifier: (item: T) => Awaitable<any> = i => i
    ): AsyncJstream<T> {
        const self = this;
        return new AsyncJstream(async function* () {
            const yielded = new Set<any>();
            for await (const item of self) {
                const id = await identifier(item);
                if (!yielded.has(id)) {
                    yield item;
                    yielded.add(id);
                }
            }
        });
    }

    public async toArray(): Promise<T[]> {
        const source = await this.getSource();
        if (this.properties.freshSource && Array.isArray(source)) {
            return source;
        } else {
            const result: T[] = [];
            for await (const item of source) {
                result.push(item);
            }
            return result;
        }
    }

    public async toSet(): Promise<Set<T>> {
        const source = await this.getSource();
        if (this.properties.freshSource && source instanceof Set) {
            return source;
        } else {
            const result = new Set<T>();
            for await (const item of source) {
                result.add(item);
            }
            return result;
        }
    }

    public async reduce(
        reducer: (
            result: DeLiteral<T>,
            item: T,
            index: number
        ) => Awaitable<DeLiteral<T>>
    ): Promise<DeLiteral<T>>;

    public async reduce<F>(
        reducer: (
            result: DeLiteral<T>,
            item: T,
            index: number
        ) => Awaitable<DeLiteral<T>>,
        finalize: (result: DeLiteral<T>, count: number) => Awaitable<F>
    ): Promise<F>;

    public async reduce<F = DeLiteral<T>>(
        reducer: (
            result: DeLiteral<T>,
            item: T,
            index: number
        ) => Awaitable<DeLiteral<T>>,
        finalize?: (result: DeLiteral<T>, count: number) => Awaitable<F>
    ): Promise<F> {
        const iterator = this[Symbol.asyncIterator]();
        let next = await iterator.next();

        if (next.done) {
            throw new Error(
                "cannot reduce empty async iterable. no initial value"
            );
        }

        let i = 1;
        
        let result: any = next.value;

        while (!(next = await iterator.next()).done) {
            result = await reducer(result, next.value, i);

            i++;
        }

        if (finalize !== undefined) {
            return await finalize(result, i);
        } else {
            return result as F;
        }
    }

    public async fold<R>(
        initialValue: R,
        folder: (result: R, item: T, index: number) => Awaitable<R>
    ): Promise<R>;

    public async fold<R, F>(
        initialValue: R,
        folder: (result: R, item: T, index: number) => Awaitable<R>,
        finalize: (result: R, count: number) => Awaitable<F>
    ): Promise<F>;

    public async fold<R, F = R>(
        initialValue: R,
        folder: (result: R, item: T, index: number) => Awaitable<R>,
        finalize?: (result: R, count: number) => Awaitable<F>
    ): Promise<F> {
        let i = 1;
        let result = initialValue;

        for await (const item of this) {
            result = await folder(result, item, i);
            i++;
        }

        if (finalize !== undefined) {
            return await finalize(result, i);
        } else {
            return result as unknown as F;
        }
    }
}
