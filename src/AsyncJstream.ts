import Jstream from "./Jstream";
import {
    nonIteratedCountOrUndefined,
    toArray,
    toMap,
} from "./privateUtils/data";
import {
    requireGreaterThanZero,
    requireInteger,
} from "./privateUtils/errorGuards";
import { getOrCall, identity } from "./privateUtils/functional";
import { getOwnEntries } from "./privateUtils/objects";
import { mkString } from "./privateUtils/strings";
import { isIterable, isStandardCollection } from "./privateUtils/typeGuards";
import { Awaitable, AwaitableIterable } from "./types/async";
import {
    AsReadonly,
    EntryLikeKey,
    EntryLikeValue,
    StandardCollection,
} from "./types/collections";
import { BreakSignal } from "./types/symbols";
import {
    AsMap,
    AsMapWithKey,
    AsMapWithValue,
    General,
    ToObject,
    ToObjectWithKey,
    ToObjectWithValue,
} from "./types/utility";
import { breakSignal } from "./utils/symbols";

export type AsyncJstreamProperties<_> = Readonly<
    Partial<{
        freshSource: boolean;
    }>
>;

export default class AsyncJstream<T> implements AsyncIterable<T> {
    private readonly getSource: () => Awaitable<AwaitableIterable<T>>;
    private readonly properties: AsyncJstreamProperties<T>;

    public constructor(
        getSource: () => Awaitable<AwaitableIterable<T>>,
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
            | Awaitable<AwaitableIterable<T>>
            | (() => Awaitable<AwaitableIterable<T>>)
    ) {
        if (source instanceof Function) {
            return new AsyncJstream(source);
        } else if (source instanceof AsyncJstream) {
            return source;
        } else {
            return new AsyncJstream(() => source);
        }
    }

    public static of<T>(...items: T[]): AsyncJstream<T> {
        return new AsyncJstream(() => items);
    }

    public static empty<T>(): AsyncJstream<T> {
        return this.of<T>();
    }

    public static fromObject<K extends keyof any, V>(
        object: Awaitable<Record<K, V>>
    ): AsyncJstream<[K & (string | symbol), V]> {
        return new AsyncJstream(async () => getOwnEntries(await object));
    }

    public async forEach(
        action: (
            item: Awaited<T>,
            index: number
        ) => void | Awaitable<BreakSignal>
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
        mapping: (item: Awaited<T>, index: number) => AwaitableResult
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

    public filter<R extends Awaited<T> = Awaited<T>>(
        predicate: (item: Awaited<T>, index: number) => Awaitable<boolean>
    ): AsyncJstream<Awaited<R>> {
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
    public unique(): AsyncJstream<Awaited<T>>;

    /**
     * Removes duplicate items from the stream
     * @param identifier How to identify each item.
     */
    public unique(
        identifier: (item: Awaited<T>) => Awaitable<any>
    ): AsyncJstream<Awaited<T>>;

    public unique(
        identifier: (item: Awaited<T>) => Awaitable<any> = identity
    ): AsyncJstream<Awaited<T>> {
        const self = this;

        return new AsyncJstream(async function* () {
            const yielded = new Set<unknown>();

            for await (const item of self) {
                const id = await identifier(item);

                if (!yielded.has(id)) {
                    yield item;
                    yielded.add(id);
                }
            }
        });
    }

    public partition(size: number | bigint): AsyncJstream<Awaited<T>[]> {
        requireGreaterThanZero(requireInteger(size));

        const self = this;
        return new AsyncJstream(async function* () {
            let partition: Awaited<T>[] = [];
            for await (const item of self) {
                partition.push(item);

                if (partition.length >= size) {
                    yield partition;
                    partition = [];
                }
            }

            if (partition.length > 0) yield partition;
        });
    }

    public append<O>(item: O): AsyncJstream<Awaited<T> | Awaited<O>> {
        const self = this;
        return new AsyncJstream(async function* () {
            yield* self;
            yield item;
        });
    }

    public prepend<O>(item: O): AsyncJstream<Awaited<O> | Awaited<T>> {
        const self = this;
        return new AsyncJstream(async function* () {
            yield item;
            yield* self;
        });
    }

    public concat<O>(
        items: Awaitable<AwaitableIterable<O>>
    ): AsyncJstream<Awaited<T> | Awaited<O>> {
        const self = this;
        return new AsyncJstream(async function* () {
            yield* self;
            yield* await items;
        });
    }

    public preConcat<O>(
        items: Awaitable<AwaitableIterable<O>>
    ): AsyncJstream<Awaited<O> | Awaited<T>> {
        const self = this;
        return new AsyncJstream(async function* () {
            yield* self;
            yield* await items;
        });
    }

    public groupBy<K>(
        keySelector: (item: Awaited<T>, index: number) => K
    ): AsyncJstream<[Awaited<K>, Awaited<T>[]]>;

    public groupBy<K, V>(
        keySelector: (item: Awaited<T>, index: number) => K,
        groupSelector: undefined,
        valueSelector: (item: Awaited<T>, index: number) => V
    ): AsyncJstream<[Awaited<K>, Awaited<V>[]]>;

    public groupBy<K, G>(
        keySelector: (item: Awaited<T>, index: number) => K,
        groupSelector: (group: Awaited<T>[], key: Awaited<K>) => G
    ): AsyncJstream<[Awaited<K>, Awaited<G>]>;

    public groupBy<K, G, V>(
        keySelector: (item: Awaited<T>, index: number) => K,
        groupSelector: (group: Awaited<V>[], key: Awaited<K>) => G,
        valueSelector: (item: Awaited<T>, index: number) => V
    ): AsyncJstream<[Awaited<K>, Awaited<G>]>;

    public groupBy<K, G>(
        keySelector: (item: Awaited<T>, index: number) => K,
        groupSelector?: (group: any[], key: Awaited<K>) => G,
        valueSelector: (item: Awaited<T>, index: number) => any = i => i
    ): AsyncJstream<[Awaited<K>, Awaited<G>]> {
        return new AsyncJstream(async () => {
            // group the items
            const groups = new Map<Awaited<K>, any>();

            let i = 0;
            for await (const item of this) {
                const key = await keySelector(item, i);
                const value = await valueSelector(item, i);

                let group = groups.get(key);
                if (group === undefined) {
                    groups.set(key, [value]);
                } else {
                    group.push(value);
                }
                i++;
            }

            // apply the group selector
            if (groupSelector !== undefined) {
                for (const entry of groups) {
                    groups.set(
                        entry[0],
                        await groupSelector(entry[1], entry[0])
                    );
                }
            }

            return groups;
        });
    }

    /**
     * @returns Whether the predicate returns true for any items in the {@link AsyncJstream}.
     * @param predicate
     */
    public async some(
        predicate: (item: Awaited<T>, index: number) => Awaitable<boolean>
    ): Promise<boolean>;

    /** @returns Whether the {@link AsyncJstream} has any items. */
    public async some(): Promise<boolean>;

    public async some(
        predicate: (
            item: Awaited<T>,
            index: number
        ) => Awaitable<boolean> = () => true
    ): Promise<boolean> {
        let i = 0;
        for await (const item of this) {
            if (await predicate(item, i++)) return true;
        }
        return false;
    }

    /**
     * @returns Whether the predicate returns true for every item in the {@link AsyncJstream}.
     * @param predicate
     */
    public async every(
        predicate: (item: Awaited<T>, index: number) => Awaitable<boolean>
    ): Promise<boolean> {
        let i = 0;
        for await (const item of this) {
            if (!(await predicate(item, i++))) return false;
        }
        return true;
    }

    public async reduce(
        reducer: (
            result: General<Awaited<T>>,
            item: Awaited<T>,
            index: number
        ) => Awaitable<General<Awaited<T>>>
    ): Promise<General<Awaited<T>>>;

    public async reduce<F>(
        reducer: (
            result: General<Awaited<T>>,
            item: Awaited<T>,
            index: number
        ) => Awaitable<General<Awaited<T>>>,
        finalize: (result: General<Awaited<T>>, count: number) => Awaitable<F>
    ): Promise<F>;

    public async reduce<F = General<Awaited<T>>>(
        reducer: (
            result: General<Awaited<T>>,
            item: Awaited<T>,
            index: number
        ) => Awaitable<General<Awaited<T>>>,
        finalize?: (result: General<Awaited<T>>, count: number) => Awaitable<F>
    ): Promise<F> {
        const iterator = this[Symbol.asyncIterator]();
        let next = await iterator.next();

        if (next.done) {
            throw new Error(
                "cannot reduce empty async iterable. no initial value"
            );
        }

        let i = 1;

        let result: General<Awaited<T>> = next.value as General<Awaited<T>>;

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
        folder: (
            result: Awaited<R>,
            item: Awaited<T>,
            index: number
        ) => Awaited<R>
    ): Promise<Awaited<R>>;

    public async fold<R, F>(
        initialValue: Awaitable<R>,
        folder: (
            result: Awaited<R>,
            item: Awaited<T>,
            index: number
        ) => Awaitable<R>,
        finalize: (result: Awaited<R>, count: number) => Awaitable<F>
    ): Promise<F>;

    public async fold<R, F>(
        initialValue: Awaitable<R>,
        folder: (
            result: Awaited<R>,
            item: Awaited<T>,
            index: number
        ) => Awaitable<R>,
        finalize?: (result: Awaited<R>, count: number) => Awaitable<F>
    ): Promise<F> {
        let i = 1;
        let result = await initialValue;

        for await (const item of this) {
            result = await folder(result, item, i);
            i++;
        }

        if (finalize !== undefined) {
            return await finalize(result, i);
        } else {
            return result as F;
        }
    }

    public async count(): Promise<number> {
        const source = await this.getSource();

        if (isIterable(source)) {
            const nonIteratedCount = nonIteratedCountOrUndefined(source);
            if (nonIteratedCount !== undefined) return nonIteratedCount;
        }

        let count = 0;
        for await (const _ of source) count++;
        return count;
    }

    public async nonIteratedCountOrUndefined(): Promise<number | undefined> {
        const source = await this.getSource();
        if (isIterable(source)) {
            return nonIteratedCountOrUndefined(source);
        } else {
            return undefined;
        }
    }

    /**
     * Copies stream into an {@link Array}.
     */
    public async toArray(): Promise<(T | Awaited<T>)[]> {
        const source = await this.getSource();
        if (this.properties.freshSource && Array.isArray(source)) {
            return source;
        } else {
            const result: Awaited<T>[] = [];
            for await (const item of source) {
                result.push(item);
            }
            return result;
        }
    }

    /**
     * Copies stream into a {@Link Set}.
     */
    public async toSet(): Promise<Set<T | Awaited<T>>> {
        const source = await this.getSource();
        if (this.properties.freshSource && source instanceof Set) {
            return source;
        } else {
            const result = new Set<Awaited<T>>();
            for await (const item of source) {
                result.add(item);
            }
            return result;
        }
    }

    public toMap(): Promise<AsMap<Iterable<Awaited<T>>>>;

    public toMap<V>(
        keySelector: undefined,
        valueSelector: (item: T, index: number) => V
    ): Promise<AsMapWithValue<Iterable<Awaited<T>>, Awaited<V>>>;

    public toMap<K>(
        keySelector: (item: T, index: number) => K
    ): Promise<AsMapWithKey<Iterable<Awaited<T>>, Awaited<K>>>;

    public toMap<K, V>(
        keySelector: (item: T, index: number) => K,
        valueSelector: (item: T, index: number) => V
    ): Promise<Map<Awaited<K>, Awaited<V>>>;

    public toMap<
        K = T extends EntryLikeKey<infer K> ? K : unknown,
        V = T extends EntryLikeValue<infer V> ? V : unknown
    >(
        keySelector?: (item: T, index: number) => K,
        valueSelector?: (item: T, index: number) => V
    ): Promise<Map<Awaited<K>, Awaited<V>>>;

    public async toMap(
        keySelector?: (item: any, index: number) => any,
        valueSelector?: (item: any, index: number) => any
    ): Promise<Map<any, any>> {
        const source = await this.getSource();

        if (
            keySelector === undefined &&
            valueSelector === undefined &&
            this.properties.freshSource &&
            source instanceof Map
        ) {
            return source;
        } else {
            return await toMap(source, keySelector, valueSelector);
        }
    }

    public asMap(): Promise<AsReadonly<AsMap<Iterable<Awaited<T>>>>>;

    public asMap<V>(
        keySelector: undefined,
        valueSelector: (item: T, index: number) => V
    ): Promise<AsReadonly<AsMapWithValue<Iterable<Awaited<T>>, Awaited<V>>>>;

    public asMap<K>(
        keySelector: (item: T, index: number) => K
    ): Promise<AsReadonly<AsMapWithKey<Iterable<Awaited<T>>, Awaited<K>>>>;

    public asMap<K, V>(
        keySelector: (item: T, index: number) => K,
        valueSelector: (item: T, index: number) => V
    ): Promise<ReadonlyMap<Awaited<K>, Awaited<V>>>;

    public asMap<
        K = T extends EntryLikeKey<infer K> ? K : unknown,
        V = T extends EntryLikeValue<infer V> ? V : unknown
    >(
        keySelector?: (item: T, index: number) => K,
        valueSelector?: (item: T, index: number) => V
    ): Promise<ReadonlyMap<Awaited<K>, Awaited<V>>>;

    public async asMap(
        keySelector?: (item: any, index: number) => any,
        valueSelector?: (item: any, index: number) => any
    ): Promise<AsReadonly<Map<any, any>>> {
        const source = await this.getSource();
        if (source instanceof Map) {
            return source;
        } else {
            return await toMap(source, keySelector, valueSelector);
        }
    }

    public toObject(): Promise<ToObject<Iterable<T>>>;

    public toObject<V>(
        keySelector: undefined,
        valueSelector: (item: T, index: number) => V
    ): Promise<ToObjectWithValue<Iterable<T>, Awaited<V>>>;

    public toObject<K extends Awaitable<keyof any>>(
        keySelector: (item: T, index: number) => K
    ): Promise<ToObjectWithKey<Iterable<T>, Awaited<K>>>;

    public toObject<K extends Awaitable<keyof any>, V>(
        keySelector: (item: T, index: number) => K,
        valueSelector: (item: T, index: number) => V
    ): Promise<Record<Awaited<K>, Awaited<V>>>;

    public async toObject(
        keySelector: (item: any, index: number) => Awaitable<keyof any> = i =>
            i?.[0],
        valueSelector: (item: any, index: number) => any = i => i?.[1]
    ): Promise<Record<keyof any, any>> {
        const object: Record<keyof any, any> = {};

        let i = 0;
        for await (const item of this) {
            const key = await keySelector(item, i);
            const value = await valueSelector(item, i);

            object[key] = value;

            i++;
        }

        return object;
    }

    public async toStandardCollection(): Promise<
        StandardCollection<T | Awaited<T>>
    > {
        const source = await this.getSource();
        if (this.properties.freshSource && isStandardCollection(source)) {
            return source;
        } else {
            return await toArray(source);
        }
    }

    public find(
        predicate: (item: Awaited<T>, index: number) => Awaitable<boolean>
    ): Promise<Awaited<T> | undefined>;

    public find<A>(
        predicate: (item: Awaited<T>, index: number) => Awaitable<boolean>,
        alternative: A | (() => A)
    ): Promise<Awaited<T> | Awaited<A>>;

    public async find(
        predicate: (item: Awaited<T>, index: number) => Awaitable<boolean>,
        alternative?: any
    ): Promise<any> {
        let i = 0;
        for await (const item of this) {
            if (await predicate(item, i)) return item;
            i++;
        }
        return await getOrCall(alternative);
    }

    public findLast(
        predicate: (item: Awaited<T>, index: number) => Awaitable<boolean>
    ): Promise<Awaited<T> | undefined>;

    public findLast<A>(
        predicate: (item: Awaited<T>, index: number) => Awaitable<boolean>,
        alternative: A | (() => A)
    ): Promise<Awaited<T> | Awaited<A>>;

    public async findLast(
        predicate: (item: Awaited<T>, index: number) => Awaitable<boolean>,
        alternative?: any
    ): Promise<any> {
        let i = 0;
        let result = getOrCall(alternative);
        for await (const item of this) {
            if (await predicate(item, i)) result = item;
            i++;
        }
        return result;
    }

    public async toJstream(): Promise<Jstream<T | Awaited<T>>> {
        return Jstream.from((await this.toStandardCollection()) as Iterable<T>);
    }

    public mkString(): Promise<string>;
    public mkString(separator: any): Promise<string>;
    public mkString(start: any, separator: any, end?: any): Promise<string>;
    public async mkString(
        startOrSeparator?: any,
        separator?: any,
        end?: any
    ): Promise<string> {
        if (arguments.length === 1) {
            return await mkString(await this.getSource(), startOrSeparator);
        } else {
            return await mkString(
                await this.getSource(),
                startOrSeparator,
                separator,
                end
            );
        }
    }
}
