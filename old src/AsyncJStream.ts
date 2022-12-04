import { AsyncAsArray, AsyncToArray } from "./utilities/AsyncData";
import {
    asyncIterable,
    asyncIterator,
    AsyncIteratorSource,
} from "./utilities/asyncIterable";
import { asyncInsertMany } from "./utilities/private/asyncData";
import { require0OrGreater, requireInteger } from "./utilities/require";

export interface AsyncJStreamSourceProperties {
    readonly fresh?: boolean;
}

// TODO docs
export class AsyncJStream<T> implements AsyncIterable<T> {
    private readonly source: AsyncIteratorSource<T>;
    private readonly sourceProperties: AsyncJStreamSourceProperties;

    // TODO docs
    public constructor(
        source: AsyncIteratorSource<T>,
        sourceProperties: AsyncJStreamSourceProperties = {}
    ) {
        this.source = source;
        this.sourceProperties = sourceProperties;
    }

    // TODO docs
    public [Symbol.asyncIterator](): AsyncIterator<T> {
        return asyncIterator(this.source);
    }

    // TODO docs
    public map<RP>(
        mapping: (item: T, index: number) => RP
    ): AsyncJStream<Awaited<RP>> {
        const self = this;
        return new AsyncJStream(async function* () {
            let i = 0;
            for await (const item of self) {
                yield await mapping(item, i++);
            }
        });
    }

    // TODO docs
    public filter<R extends T = T>(
        predicate: (item: T, index: number) => boolean | Promise<boolean>
    ): AsyncJStream<R> {
        const self = this;
        return new AsyncJStream(async function* () {
            let i = 0;
            for await (const item of self) {
                if (await predicate(item, i++)) {
                    yield item as R;
                }
            }
        });
    }

    // TODO docs
    public concatToEnd<O>(items: AsyncIteratorSource<O>): AsyncJStream<T | O> {
        const self = this;
        return new AsyncJStream(async function* () {
            yield* self;
            yield* asyncIterable(items);
        });
    }

    /**
     * Alias for {@link concatToEnd}.
     */
    public concat<O>(items: AsyncIteratorSource<O>): AsyncJStream<T | O> {
        return this.concatToEnd(items);
    }

    // TODO docs
    public concatToStart<O>(
        items: AsyncIteratorSource<O>
    ): AsyncJStream<T | O> {
        const self = this;
        return new AsyncJStream(async function* () {
            yield* asyncIterable(items);
            yield* self;
        });
    }

    // TODO docs
    public append<OP>(item: OP): AsyncJStream<T | Awaited<OP>> {
        const self = this;
        return new AsyncJStream(async function* () {
            yield* self;
            yield await item;
        });
    }

    // TODO docs
    public prepend<OP>(item: OP): AsyncJStream<T | Awaited<OP>> {
        const self = this;
        return new AsyncJStream(async function* () {
            yield await item;
            yield* self;
        });
    }

    // TODO docs
    public insert<OP, Overflow extends "pad" | "throw" | "truncate" = "throw">(
        index: number | bigint,
        item: OP,
        overflow: Overflow = "throw" as any
    ): AsyncJStream<
        T | Awaited<OP> | (Overflow extends "pad" ? undefined : never)
    > {
        // TODO? allow negative index
        require0OrGreater(requireInteger(index));
        return this.insertMany(index, [item], overflow) as any;
    }

    // TODO docs
    public insertMany<
        O,
        Overflow extends "pad" | "throw" | "truncate" = "throw"
    >(
        index: number | bigint,
        items: AsyncIteratorSource<O>,
        overflow: Overflow = "throw" as any
    ): AsyncJStream<T | O | (Overflow extends "pad" ? undefined : never)> {
        return new AsyncJStream(
            asyncInsertMany(this.source, index, items, overflow)
        );
    }

    // TODO docs
    public async toArray(): Promise<T[]> {
        if (this.sourceProperties.fresh) {
            return (await AsyncAsArray(this.source)) as T[];
        } else {
            return await AsyncToArray(this.source);
        }
    }

    // TODO docs
    public async asArray(): Promise<readonly T[]> {
        return await AsyncAsArray(this.source);
    }
}
