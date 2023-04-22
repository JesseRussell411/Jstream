import AsyncJstream from "./AsyncJstream";
import NeverEndingOperationError from "./errors/NeverEndingOperationError";
import {
    asStandardCollection,
    fisherYatesShuffle,
    groupBy,
    max,
    memoizeIterable,
    min,
    nonIteratedCount,
    nonIteratedCountOrUndefined,
    skip,
    split,
    take,
    takeFinal,
    toArray,
    toMap,
    toSet,
} from "./privateUtils/data";
import {
    requireGreaterThanZero,
    requireInteger,
    requireIntegerOrInfinity,
    requireNonNaN,
    requireNonNegative,
    requireSafeInteger,
    requireSafeIntegerOrInfinity,
} from "./privateUtils/errorGuards";
import { identity, resultOf, returns } from "./privateUtils/functional";
import {
    emptyIterable,
    iterableFromIterator,
    iterableFromIteratorGetter,
    range,
} from "./privateUtils/iterable";
import { pick } from "./privateUtils/objects";
import { makeString } from "./privateUtils/strings";
import { isArray, isIterable } from "./privateUtils/typeGuards";
import {
    asComparator,
    multiCompare,
    reverseOrder,
    smartComparator,
} from "./sorting/sorting";
import { breakSignal } from "./symbols/symbols";
import {
    AsMap,
    AsMapWithKey,
    AsMapWithValue,
    AsReadonly,
    EntryLikeKey,
    EntryLikeValue,
    ToObject,
    ToObjectWithKey,
    ToObjectWithValue,
} from "./types/collections";
import { General } from "./types/literals";
import { Comparator, Order } from "./types/sorting";
import { BreakSignal } from "./types/symbols";

/**
 * Properties of the {@link Jstream} and its source. Boolean properties are assumed to be "unknown" when undefined, not false.
 */
export type JstreamProperties<_> = Readonly<
    Partial<{
        /** Each call to the source getter produces a new copy of the source. This means that the source can be modified safely, assuming it is a mutable collection like {@link Array}, which is not guarantied. */
        freshSource: boolean;
        /** Calling the source getter is expensive, ie. it's more than an O(1) operation. */
        expensiveSource: boolean;
        /** Whether the {@link Jstream} is known to never end. False means unknown. */
        infinite: boolean;
    }>
>;

// TODO tuple support
export type JstreamToArrayRecursive<T> = T extends Jstream<infer SubT>
    ? JstreamToArrayRecursive<SubT>[]
    : T extends readonly []
    ? []
    : T extends readonly [infer TupleStart, ...infer TupleRest]
    ? [
          JstreamToArrayRecursive<TupleStart>,
          ...JstreamToArrayRecursive<TupleRest>
      ]
    : T extends readonly (infer SubT)[]
    ? JstreamToArrayRecursive<SubT>[]
    : T;

export type JstreamAsArrayRecursive<T> = T extends Jstream<infer SubT>
    ? readonly JstreamAsArrayRecursive<SubT>[]
    : T extends readonly []
    ? []
    : T extends readonly [infer TupleStart, ...infer TupleRest]
    ? readonly [
          JstreamAsArrayRecursive<TupleStart>,
          ...JstreamAsArrayRecursive<TupleRest>
      ]
    : T extends readonly (infer SubT)[]
    ? readonly JstreamAsArrayRecursive<SubT>[]
    : T;

export type Comparison =
    | "equals"
    | "lessThan"
    | "greaterThan"
    | "lessThanOrEqualTo"
    | "greaterThanOrEqualTo";

// TODO rename to Tstream
// TODO merge, loose and strict; join(Iterable<T> delim) or interleave or insertInBetween, whatever name works
// TODO throws declarations for all the NeverEndingOperationErrors
// TODO documentation
// TODO recursive map and filter but don't get carried away. Reduce and fold not needed because we can flatten.
// TODO recursive flatten
// TODO field-comparison-value for find and findFinal, just need type definitions, then use .filter(field, comparison, value).ifEmpty(() => [resultOf(alternative)]).first/final()
// TODO? move infinity checks into iteration instead of method body
// TODO keep track of tuple type
// TODO implement sorted set and circular buffer so we can go back to 0 dependencies

// DESIGN NOTE: every public facing, non-static method in this class is actually an
// accessor that returns a function bound to "this".

// This is done to ensure that the method always has the correct "this". The same effect could have
// been achieved by making every method a field containing an arrow function, but that would have
// made the class instance huge and growing as new features are added, which would increase memory
// usage and instantiation time (not by much, admittedly).

// Additionally, named functions are returned instead of antonymous arrow functions. It would
// have been simpler to return arrow function as they would automatically bind on "this", so
// it wouldn't be necessary to declare a "self" variable outside of the function, but using named
// functions makes the call stack in the event of an error more descriptive while only requiring
// the addition of "const self = this;".

// TODO? arrow functions can be named too if they are assigned to a variable first.
// Consider changing to named arrow functions if a reason to do so comes up.

export default class Jstream<T> implements Iterable<T> {
    // =================
    //   static fields
    // =================
    private static emptyJstream: Jstream<any> = new Jstream({}, emptyIterable);
    // =============
    //   private
    // =============
    protected readonly getSource: () => Iterable<T>;
    protected readonly properties: JstreamProperties<T>;

    /**
     * Ensures that the {@link Jstream} is not known to be infinite. {@link https://en.wikipedia.org/wiki/Halting_problem Does not ensure that it is finite}.
     * @throws If the {@link Jstream} is known to be infinite.
     */
    protected requireThisNotInfinite(message?: string) {
        if (this.properties.infinite) {
            throw new NeverEndingOperationError(message);
        }
    }

    // ========
    //  public
    // ========
    public constructor(
        properties: JstreamProperties<T>,
        getSource: () => Iterable<T>
    ) {
        this.getSource = getSource;
        this.properties = properties;
    }

    /**
     * @returns An iterator over the Jstream.
     */
    public get [Symbol.iterator]() {
        return () => {
            return this.getSource()[Symbol.iterator]();
        };
    }

    /**
     * @returns A Jstream over the given source or the result of the given function.
     */
    public static from<T>(
        source: Iterable<T> | Iterator<T> | (() => Iterable<T> | Iterator<T>)
    ): Jstream<T> {
        if (source instanceof Function) {
            return new Jstream({ expensiveSource: true }, () => {
                const subSource = source();

                if (isIterable(subSource)) {
                    return subSource;
                } else {
                    return iterableFromIterator(subSource);
                }
            });
        } else if (source instanceof Jstream) {
            return source;
        } else if (
            source instanceof Array ||
            source instanceof Set ||
            source instanceof Map
        ) {
            return new Jstream({ expensiveSource: false }, () => source);
        } else if (isIterable(source)) {
            return new Jstream({ expensiveSource: false }, () => source);
        } else {
            const iterable = iterableFromIterator(source);
            return new Jstream({ expensiveSource: false }, () => iterable);
        }
    }

    /**
     * @returns A Jstream over the given items.
     */
    public static of<T>(...items: readonly T[]): Jstream<T> {
        return new Jstream({}, () => items);
    }

    /**
     * @returns An empty Jstream of the given type.
     */
    public static empty<T>(): Jstream<T> {
        return Jstream.emptyJstream;
    }

    // TODO don't take non enumerable properties, like what Object.entries does
    /**
     * @returns A Jstream over the entries of the given object.
     */
    public static fromObject<K extends keyof any, V>(
        object: Record<K, V> | (() => Record<K, V>),
        {
            includeStringKeys = true,
            includeSymbolKeys = false,
        }: {
            /** Whether to include fields indexed by symbols. Defaults to true. */
            includeSymbolKeys?: boolean;
            /** Whether to include fields indexed by strings. Defaults to true. */
            includeStringKeys?: boolean;
        } = {}
    ): Jstream<[K & (string | symbol), V]> {
        // TODO add inherited values
        const instance = resultOf(object);
        if (includeStringKeys && includeSymbolKeys) {
            return new Jstream(
                { expensiveSource: true, freshSource: true },
                () =>
                    [
                        ...Object.getOwnPropertyNames(instance),
                        ...Object.getOwnPropertySymbols(instance),
                    ].map(key => [key as any, (instance as any)[key]])
            );
        } else if (includeStringKeys) {
            return new Jstream(
                { expensiveSource: true, freshSource: true },
                () =>
                    Object.getOwnPropertyNames(instance).map(name => [
                        name as K & (string | symbol),
                        (instance as any)[name] as V,
                    ])
            );
        } else if (includeSymbolKeys) {
            return new Jstream(
                { expensiveSource: true, freshSource: true },
                () =>
                    Object.getOwnPropertySymbols(instance).map(symbol => [
                        symbol as K & (string | symbol),
                        (instance as any)[symbol] as V,
                    ])
            );
        } else {
            return Jstream.empty();
        }
    }

    // TODO docs
    public static get generate(): {
        <T>(generator: (index: number) => T): Jstream<T>;
        <T>(generator: (index: number) => T, count: number): Jstream<T>;
        <T>(generator: (index: bigint) => T, count: bigint): Jstream<T>;
        <T>(item: T, count?: number | bigint): Jstream<T>;
    } {
        return <T>(
            itemOrGenerator: T | ((index: number | bigint) => T),
            count: number | bigint = Infinity
        ): Jstream<T> => {
            requireIntegerOrInfinity(count);
            requireNonNaN(requireNonNegative(count));

            return new Jstream({ infinite: count === Infinity }, function* () {
                let i = typeof count === "number" ? 0 : 0n;
                if (itemOrGenerator instanceof Function) {
                    for (; i < count; i++) {
                        yield itemOrGenerator(i);
                    }
                } else {
                    for (; i < count; i++) {
                        yield itemOrGenerator;
                    }
                }
            });
        };
    }

    /**
     * @returns A Jstream over a range of integers from start to end, incremented by step.
     */
    public static range(
        start: bigint,
        end: bigint,
        step: bigint
    ): Jstream<bigint>;
    /**
     * @returns A Jstream over a range of integers from start to end, incremented by 1 or -1 if end is less than start.
     */
    public static range(start: bigint, end: bigint): Jstream<bigint>;
    /**
     * @returns A Jstream over a range of integers from 0 to end, incremented by 1.
     */
    public static range(end: bigint): Jstream<bigint>;

    /**
     * @returns A Jstream over a range of integers from start to end, incremented by step.
     */
    public static range(
        start: number | bigint,
        end: number | bigint,
        step: number | bigint
    ): Jstream<number>;
    /**
     * @returns A Jstream over a range of integers from start to end, incremented by 1 or -1 if end is less than start.
     */
    public static range(
        start: number | bigint,
        end: number | bigint
    ): Jstream<number>;
    /**
     * @returns A Jstream over a range of integers from 0 to end, incremented by 1.
     */
    public static range(end: number | bigint): Jstream<number>;

    public static range(
        _startOrEnd: number | bigint,
        _end?: number | bigint,
        _step?: number | bigint
    ): Jstream<number> | Jstream<bigint> {
        if (_end === undefined) {
            const end = _startOrEnd;
            return new Jstream(
                { infinite: end === Infinity },
                returns(range(end))
            );
        } else if (_step === undefined) {
            const start = _startOrEnd;
            const end = _end;
            return new Jstream(
                { infinite: end === Infinity },
                returns(range(start, end))
            );
        } else {
            const start = _startOrEnd;
            const end = _end;
            const step = _step;
            return new Jstream(
                {
                    infinite:
                        (step > 0 && end === Infinity) ||
                        (step < 0 && end === -Infinity),
                },
                returns(range(start, end, step))
            );
        }
    }

    // ================
    //    properties
    // ================

    /**
     * Whether the {@link Jstream} never ends. Does not return false because it cannot be known whether the {@link Jstream} ends {@link https://en.wikipedia.org/wiki/Halting_problem without iterating it}.
     * @returns true if the {@link Jstream} is known to be infinite or undefined otherwise.
     */
    public get isInfinite(): true | undefined {
        if (this.properties.infinite) {
            return true;
        } else {
            return undefined;
        }
    }

    // =============
    //    methods
    // =============

    /**
     * Calls the action on each item in the {@link Jstream} in order, one at a time. Stops if the action returns {@link breakSignal}.
     * @param action The action. Return {@link breakSignal} to stop the loop.
     * @returns void or {@link breakSignal} if {@link breakSignal} was returned by the action.
     */
    public get forEach() {
        const self = this;
        return function forEach(
            action: (item: T, index: number) => any | BreakSignal
        ): void | BreakSignal {
            let i = 0;
            for (const item of self) {
                const result = action(item, i);
                if (Object.is(result, breakSignal)) return breakSignal;
                i++;
            }
        };
    }

    // =====================
    // basic transformations
    // =====================

    public get map(): {
        <Field extends keyof T>(fields: Field[]): Jstream<
            Record<Field, T[Field]>
        >;
        /**
         * Maps each item in the stream to a new item using the given mapping function.
         */
        <R>(mapping: (item: T, index: number) => R): Jstream<R>;
    } {
        const self = this;
        return function map(arg: any) {
            if (arg instanceof Function) {
                const mapping = arg;
                return new Jstream(
                    { infinite: self.properties.infinite },
                    function* () {
                        let i = 0;
                        for (const item of self) {
                            yield mapping(item, i);
                            i++;
                        }
                    }
                );
            } else {
                return new Jstream(
                    { infinite: self.properties.infinite },
                    function* () {
                        for (const item of self) {
                            yield pick(item, arg);
                        }
                    }
                );
            }
        } as any;
    }

    // TODO index by other things
    /**
     * Maps each item in the stream to a tuple containing the item's index and then the item in that order.
     */
    public get indexed() {
        const self = this;
        return function indexed(): Jstream<[number, T]> {
            return self.map((item, index) => [index, item]);
        };
    }

    // TODO docs
    public get filter(): {
        <R extends T = T>(
            condition: (item: T, index: number) => boolean
        ): Jstream<R>;
        <Field extends keyof T, R extends T = T>(
            field: Field,
            comparison: "is",
            value: T[Field]
        ): Jstream<R>;
        <Field extends keyof T, O, R extends T = T>(
            field: Field,
            comparison: Comparison,
            value: O,
            order?: Order<T | O>
        ): Jstream<R>;
        <M, O, R extends T = T>(
            getField: (item: T, index: number) => M,
            comparison: Comparison,
            value: O,
            order?: Order<M | O>
        ): Jstream<R>;
    } {
        const self = this;
        return function filter(
            ...args:
                | [condition: (item: T, index: number) => boolean]
                | [
                      field: any | ((item: T, index: number) => any),
                      comparison: Comparison | "is",
                      value: any,
                      order: Order<any>
                  ]
        ) {
            // case for test function that returns a boolean
            if (args.length === 1) {
                const comparison = args[0];
                return new Jstream(
                    { infinite: self.properties.infinite },
                    function* () {
                        let i = 0;
                        for (const item of self) {
                            if (comparison(item, i)) yield item;
                            i++;
                        }
                    }
                );
            }

            // field comparison value
            const [field, comparison, value, order = smartComparator] = args;

            // special case for Map source and field of 0 with "is" comparison
            if (comparison === "is" && field == 0) {
                return new Jstream(
                    { infinite: self.properties.infinite },
                    function* () {
                        const source = self.getSource();
                        if (source instanceof Map) {
                            // if the source is a map and field is 0 and the comparison is "is"
                            // the map can be queried for the entry
                            const item_1 = source.get(value);
                            if (item_1 !== undefined || source.has(value)) {
                                yield [value, item_1];
                            }
                        } else {
                            // otherwise, a linear search is still required
                            for (const item of source) {
                                if (Object.is(value, (item as any)[field])) {
                                    yield item;
                                }
                            }
                        }
                    }
                );
            }

            // general case for: field comparison value
            const comparator = asComparator(order);
            const conditions: Record<
                Comparison | "is",
                (a: any, b: any) => boolean
            > = {
                is: (a, b) => Object.is(a, b),
                equals: (a, b) => comparator(a, b) === 0,
                lessThan: (a, b) => comparator(a, b) < 0,
                lessThanOrEqualTo: (a, b) => comparator(a, b) <= 0,
                greaterThan: (a, b) => comparator(a, b) > 0,
                greaterThanOrEqualTo: (a, b) => comparator(a, b) >= 0,
            };
            const condition = conditions[comparison];

            if (typeof field === "function") {
                return new Jstream(
                    { infinite: self.properties.infinite },
                    function* () {
                        let i = 0;
                        for (const item of self) {
                            if (condition(field(item, i), value)) yield item;
                            i++;
                        }
                    }
                );
            } else {
                return new Jstream(
                    { infinite: self.properties.infinite },
                    function* () {
                        for (const item of self) {
                            if (condition((item as any)[field], value))
                                yield item;
                        }
                    }
                );
            }
        } as any;
    }
    /**
     * Appends the items to the end of the stream.
     */
    public get concat() {
        const self = this;
        return function concat<O>(items: Iterable<O>): Jstream<T | O> {
            return new Jstream(
                {
                    infinite:
                        self.properties.infinite ||
                        (items instanceof Jstream && items.isInfinite),
                },
                function* () {
                    yield* self;
                    yield* items;
                }
            );
        };
    }

    /**
     * Appends the items to the start of the stream.
     */
    public get preConcat() {
        const self = this;
        return function preConcat<O>(items: Iterable<O>): Jstream<O | T> {
            return new Jstream(
                {
                    infinite:
                        self.properties.infinite ||
                        (items instanceof Jstream && items.isInfinite),
                },
                function* () {
                    yield* items;
                    yield* self;
                }
            );
        };
    }

    /**
     * Appends the item to the end of the stream.
     */
    public get append() {
        const self = this;
        return function append<O>(item: O): Jstream<T | O> {
            return new Jstream(
                {
                    freshSource: self.properties.freshSource,
                    expensiveSource: self.properties.expensiveSource,
                    infinite: self.properties.infinite,
                },
                () => {
                    const source = self.getSource();
                    if (self.properties.freshSource && Array.isArray(source)) {
                        source.push(item);
                        return source;
                    }

                    return {
                        *[Symbol.iterator]() {
                            yield* source;
                            yield item;
                        },
                    };
                }
            );
        };
    }

    /**
     * Appends the item to the start of the stream.
     */
    public get prepend() {
        const self = this;
        return function prepend<O>(item: O): Jstream<O | T> {
            return self.preConcat([item]);
        };
    }

    public get sort(): {
        (): SortedJstream<T>;
        /** Sorts the stream using the given comparator in ascending order. */
        (comparator: Comparator<T>): SortedJstream<T>;
        /** Sorts the stream by the result of the given mapping function using {@link smartComparator} in ascending order. */
        (keySelector: (item: T) => any): SortedJstream<T>;
    } {
        const self = this;
        return function sort(
            order: Order<T> = smartComparator
        ): SortedJstream<T> {
            return self.sortBy(order);
        };
    }

    public get sortDescending(): {
        (): SortedJstream<T>;
        /** Sorts the stream using the given comparator in descending order. */
        (comparator: Comparator<T>): SortedJstream<T>;
        /** Sorts the stream by the result of the given mapping function using {@link smartComparator} in descending order. */
        (keySelector: (item: T) => any): SortedJstream<T>;
    } {
        const self = this;
        return function sortDescending(
            order: Order<T> = smartComparator
        ): SortedJstream<T> {
            return self.sortByDescending(order);
        };
    }
    public get sortBy(): {
        /** Sorts the stream using the given comparator in ascending order. */
        (comparator: Comparator<T>): SortedJstream<T>;
        /** Sorts the stream by the result of the given mapping function using {@link smartComparator} in ascending order. */
        (keySelector: (item: T) => any): SortedJstream<T>;
    } {
        const self = this;
        return function sortBy(order: Order<T>): SortedJstream<T> {
            return new SortedJstream(
                order,
                asSortedJstreamProperties(self.properties),
                self.getSource
            );
        };
    }

    public get sortByDescending(): {
        /** Sorts the stream using the given comparator in descending order. */
        (comparator: Comparator<T>): SortedJstream<T>;
        /** Sorts the stream by the result of the given mapping function using {@link smartComparator} in descending order. */
        (keySelector: (item: T) => any): SortedJstream<T>;
    } {
        const self = this;
        return function sortByDescending(order: Order<T>): SortedJstream<T> {
            return self.sortBy(reverseOrder(order));
        };
    }

    /**
     * Reverses the order of the {@link Jstream}.
     */
    public get reverse() {
        const self = this;
        return function reverse(): Jstream<T> {
            self.requireThisNotInfinite("cannot reverse infinite items");
            const newGetSource = () => {
                const source = self.getSource();

                if (isArray(source)) {
                    return iterableFromIteratorGetter(function* () {
                        for (let i = source.length - 1; i >= 0; i--) {
                            yield source[i] as T;
                        }
                    });
                } else {
                    const array = toArray(source);
                    array.reverse();
                    return array;
                }
            };

            return new Jstream(
                { expensiveSource: true, freshSource: true },
                newGetSource
            );
        };
    }

    /**
     * Repeats the stream the given number of times.
     * @param times How many repeats to make. 1 does nothing. 0 returns an empty stream. Negative numbers reverse the stream before repeating it. Must be an integer.
     */
    public get repeat() {
        const self = this;
        return function repeat(times: number | bigint): Jstream<T> {
            requireIntegerOrInfinity(times);

            if (times === 0 || times === 0n) return Jstream.empty();
            if (times < 0) return self.reverse().repeat(-times);

            return new Jstream(
                { infinite: self.properties.infinite || times === Infinity },
                times === Infinity
                    ? function* () {
                          const memoized = memoizeIterable(self);
                          while (true) {
                              yield* memoized;
                          }
                      }
                    : function* () {
                          const memoized = memoizeIterable(self);
                          for (let i = 0n; i < times; i++) {
                              yield* memoized;
                          }
                      }
            );
        };
    }

    /**
     * Filters undefined out of the stream.
     */
    public get defined() {
        const self = this;
        return function defined(): Jstream<T & ({} | null)> {
            return self.filter(item => item !== undefined);
        };
    }

    /**
     * Filters null out of the stream.
     */
    public get nonNull() {
        const self = this;
        return function nonNull(): Jstream<T & ({} | undefined)> {
            return self.filter(item => item !== null);
        };
    }

    /**
     * Filters duplicate items out of the {@link Jstream}.
     *
     * @param How to identify each item. Defaults to using the item itself.
     */
    public get distinct() {
        const self = this;
        return function distinct(
            identifier: (item: T) => any = identity
        ): Jstream<T> {
            return new Jstream(
                { infinite: self.properties.infinite },
                function* () {
                    const source = self.getSource();

                    // if source is a set and identifier is identity, the contents are already distinct
                    if (source instanceof Set && identifier === identity) {
                        yield* source;
                    }

                    const alreadyYielded = new Set<any>();

                    for (const item of source) {
                        const id = identifier(item);

                        if (!alreadyYielded.has(id)) {
                            yield item;
                            alreadyYielded.add(id);
                        }
                    }
                }
            );
        };
    }

    /** Equivalent to {@link Array.copyWithin}. */
    public get copyWithin() {
        const self = this;
        return function copyWithin(
            target: number | bigint,
            start: number | bigint,
            end?: number | bigint
        ): Jstream<T> {
            self.requireThisNotInfinite();
            //TODO optimize
            return new Jstream(
                { expensiveSource: true, freshSource: true },
                () =>
                    self
                        .toArray()
                        .copyWithin(Number(target), Number(start), Number(end))
            );
        };
    }

    /**
     * Shuffles the contents of the stream.
     * @param getRandomInt Returns a random integer that's greater than or equal to 0 and less than upperBound. Defaults to using {@link Math.random}, which is not cryptographically secure.
     */
    public get shuffle() {
        const self = this;
        return function shuffle(getRandomInt?: (upperBound: number) => number) {
            return new Jstream(
                { expensiveSource: true, freshSource: true },
                () => {
                    const array = self.toArray();
                    fisherYatesShuffle(array, getRandomInt);
                    return array;
                }
            );
        };
    }

    /**
     * Skips the given number of items from the start of the {@link Jstream}.
     * @param count How many items to skip. Must be a non negative integer. If {@link Infinity}, an empty {@link Jstream} is returned.
     */
    public get skip() {
        const self = this;
        return function skip(count: number | bigint): Jstream<T> {
            if (count === Infinity) return Jstream.empty();
            if (count === 0 || count === 0n) return self;
            requireNonNegative(count);
            requireInteger(count);

            return new Jstream(
                { infinite: self.properties.infinite },
                function* () {
                    const iterator = self[Symbol.iterator]();

                    for (let i = 0n; i < count; i++) {
                        if (iterator.next().done) return;
                    }

                    let next: IteratorResult<T>;

                    while (!(next = iterator.next()).done) {
                        yield next.value;
                    }
                }
            );
        };
    }

    public get skipEveryNth() {
        const self = this;
        return function skipEveryNth(n: number | bigint): Jstream<T> {
            requireGreaterThanZero(n);
            requireInteger(n);

            return new Jstream(
                { infinite: self.properties.infinite },
                typeof n === "number"
                    ? function* () {
                          let i = 0;
                          for (const item of self) {
                              if (i % n === 0) {
                                  i = 0;
                              } else {
                                  yield item;
                              }
                              i++;
                          }
                      }
                    : function* () {
                          let i = 0n;
                          for (const item of self) {
                              if (i % n === 0n) {
                                  i = 0n;
                              } else {
                                  yield item;
                              }
                              i++;
                          }
                      }
            );
        };
    }

    public get skipSparse() {
        const self = this;
        return function skipSparse(count: number | bigint): Jstream<T> {
            if (count === 0 || count === 0n) return self;
            if (count === Infinity) return Jstream.empty();

            if (self.properties.infinite) {
                throw new NeverEndingOperationError();
            }
            if (typeof count === "bigint") {
                return self.skipSparse(Number(count));
            }
            requireSafeInteger(requireNonNegative(count));

            return new Jstream({}, function* () {
                const collection = asStandardCollection(self.getSource());
                const length = nonIteratedCount(collection);

                const nth = Math.trunc(length / count);
                let n = 0;
                let skipCount = 0;
                for (const item of collection as Iterable<T>) {
                    if (n % nth === 0) {
                        if (skipCount >= count) return;
                        n = 0;
                    } else {
                        yield item;
                    }
                    n++;
                }
            });
        };
    }

    /** Skips the given number of items at the end of the stream. */
    public get skipFinal() {
        const self = this;
        return function skipFinal(count: number | bigint): Jstream<T> {
            if (count === 0 || count === 0n) return self;
            if (count === Infinity) return Jstream.empty();

            self.requireThisNotInfinite();
            requireNonNegative(requireSafeInteger(count));

            if (typeof count === "bigint") {
                return self.skipFinal(Number(count));
            }

            return new Jstream(
                {
                    freshSource: self.properties.freshSource,
                    expensiveSource: self.properties.expensiveSource,
                    infinite: self.properties.infinite,
                },
                () => {
                    const source = self;
                    if (isArray(source)) {
                        if (self.properties.freshSource) {
                            source.length -= Math.min(count, source.length);
                            return source;
                        } else {
                            return iterableFromIteratorGetter(function* () {
                                for (
                                    let i = 0;
                                    i < source.length - count;
                                    i++
                                ) {
                                    yield source[i] as T;
                                }
                            });
                        }
                    } else {
                        // TODO optimize and allow infinite iterables by using a cache
                        const array = toArray(source);
                        array.length -= Math.min(count, array.length);
                        return array;
                    }
                }
            );
        };
    }

    /**
     * Skips items from stream until one causes the condition to return false.
     * Takes the rest including the item that caused the condition to return false.
     */
    public get skipWhile() {
        return (condition: (item: T, index: number) => boolean): Jstream<T> => {
            const self = this;

            return new Jstream(
                { infinite: this.properties.infinite },
                function* () {
                    const iterator = self[Symbol.iterator]();
                    let index = 0;
                    let next: IteratorResult<T> = iterator.next();
                    do {
                        if (!condition(next.value, index)) {
                            break;
                        }
                        index++;
                    } while (!(next = iterator.next()).done);

                    do {
                        yield next.value;
                    } while (!(next = iterator.next()).done);
                }
            );
        };
    }

    /**
     * Skips items from stream until one causes the condition to return true.
     * Takes the rest including the item that caused the condition to return false.
     */
    public get skipUntil() {
        const self = this;
        return function skipUntil(
            condition: (item: T, index: number) => boolean
        ): Jstream<T> {
            return self.skipWhile((item, index) => !condition(item, index));
        };
    }

    /** Takes the given number of items from the stream and skips the rest. */
    public get take() {
        const self = this;
        return function take(count: number | bigint): Jstream<T> {
            if (count === Infinity) return self;
            requireNonNegative(count);
            requireInteger(count);

            return new Jstream(
                {
                    infinite: self.properties.infinite && count === Infinity,
                    freshSource: self.properties.freshSource,
                    expensiveSource: self.properties.expensiveSource,
                },
                () => {
                    const source = self.getSource();

                    if (self.properties.freshSource && Array.isArray(source)) {
                        requireSafeInteger(count);
                        source.length = Math.min(source.length, Number(count));
                        return source;
                    }

                    return {
                        *[Symbol.iterator]() {
                            const iterator = source[Symbol.iterator]();

                            for (
                                let i = typeof count === "bigint" ? 0n : 0;
                                i < count;
                                i++
                            ) {
                                const next = iterator.next();
                                if (next.done) return;
                                yield next.value;
                            }
                        },
                    };
                }
            );
        };
    }

    public get takeEveryNth() {
        const self = this;
        return function takeEveryNth(n: number | bigint): Jstream<T> {
            if (n === Infinity) return Jstream.empty();
            requireGreaterThanZero(n);
            requireInteger(n);

            return new Jstream(
                { infinite: self.properties.infinite },
                typeof n === "number"
                    ? function* () {
                          let i = 0;
                          for (const item of self) {
                              if (i % n === 0) {
                                  yield item;
                                  i = 0;
                              }
                              i++;
                          }
                      }
                    : function* () {
                          let i = 0n;
                          for (const item of self) {
                              if (i % n === 0n) {
                                  yield item;
                                  i = 0n;
                              }
                              i++;
                          }
                      }
            );
        };
    }

    public get takeSparse() {
        const self = this;
        return function takeSparse(count: number | bigint): Jstream<T> {
            if (count === 0 || count === 0n) {
                return Jstream.empty();
            }

            if (typeof count === "bigint") {
                return self.takeSparse(Number(count));
            }

            if (count === Infinity) return self;

            self.requireThisNotInfinite();

            requireSafeInteger(requireNonNegative(count));

            return new Jstream({}, function* () {
                const collection = asStandardCollection(self.getSource());
                const length = nonIteratedCount(collection);

                const nth = Math.trunc(length / count);
                let n = 0;
                let yieldCount = 0;
                for (const item of collection as Iterable<T>) {
                    if (n % nth === 0) {
                        yield item;
                        yieldCount++;
                        if (yieldCount >= count) return;
                        n = 0;
                    }
                    n++;
                }
            });
        };
    }

    /** Takes the given number of items from the end of the stream and skips the rest. */
    public get takeFinal() {
        const self = this;
        const externalTakeFinal = takeFinal;
        return function takeFinal(count: number | bigint): Jstream<T> {
            if (count === Infinity) return self;
            requireNonNegative(requireSafeIntegerOrInfinity(count));
            self.requireThisNotInfinite(
                "cannot take the final items of infinite items"
            );

            if (count === 0 || count === 0n) return Jstream.empty();

            return new Jstream(
                { infinite: self.properties.infinite && count === Infinity },
                () => externalTakeFinal(self, count)
            );
        };
    }

    /** Takes items from stream until one causes the condition to return false. The rest are skipped including the item that caused the condition to return false. */
    public get takeWhile() {
        return (condition: (item: T, index: number) => boolean): Jstream<T> => {
            const self = this;
            return new Jstream({}, function* () {
                let index = 0;
                for (const item of self) {
                    if (condition(item, index)) {
                        yield item;
                    } else {
                        break;
                    }
                    index++;
                }
            });
        };
    }

    /** Takes items from stream until one causes the condition to return true. The rest are skipped including the item that caused the condition to return false. */
    public get takeUntil() {
        return (condition: (item: T, index: number) => boolean): Jstream<T> => {
            return this.takeWhile((item, index) => !condition(item, index));
        };
    }

    public get groupBy(): {
        /**
         * Groups the items in the stream by the given keySelector.
         */
        <K>(keySelector: (item: T, index: number) => K): Jstream<
            readonly [key: K, group: Jstream<T>]
        >;
        /**
         * Groups the items in the stream by the given keySelector.
         *
         * @param groupSelector Mapping applied to each group.
         */
        <K, G>(
            keySelector: (item: T, index: number) => K,
            groupSelector: (group: Jstream<T>, key: K) => G
        ): Jstream<readonly [key: K, group: G]>;

        /**
         * Groups the items in the stream by the given key.
         */
        <Field extends keyof T>(field: Field): Jstream<
            readonly [key: T[Field], group: Jstream<T>]
        >;

        /**
         * Groups the items in the stream by the given key.
         *
         * @param groupSelector Mapping applied to each group.
         */
        <Field extends keyof T, G>(
            field: Field,
            groupSelector: (group: Jstream<T>, key: Field) => G
        ): Jstream<readonly [key: T[Field], group: G]>;
    } {
        const self = this;
        return function groupBy<G>(
            keySelectorOrField: ((item: T, index: number) => any) | keyof T,
            groupSelector?: (group: Jstream<T>, key: any) => G
        ): Jstream<readonly [key: any, group: Jstream<T> | G]> {
            self.requireThisNotInfinite("cannot group infinite items");

            const newGetSource = () => {
                const groups = new Map<any, any>();

                let index = 0;

                const keySelector =
                    keySelectorOrField instanceof Function
                        ? keySelectorOrField
                        : (item: T) => item[keySelectorOrField];

                for (const item of self) {
                    const key = keySelector(item, index);

                    const group = groups.get(key);
                    if (group === undefined) {
                        groups.set(key, [item]);
                    } else {
                        group.push(item);
                    }

                    index++;
                }

                // convert all the groups to Jstreams
                for (const entry of groups) {
                    groups.set(entry[0], new Jstream({}, returns(entry[1])));
                }

                if (groupSelector !== undefined) {
                    for (const entry of groups) {
                        const group = groupSelector(entry[1], entry[0]);
                        groups.set(entry[0], group);
                    }
                }

                return groups;
            };

            return new Jstream(
                { expensiveSource: true, freshSource: true },
                newGetSource
            ) as any;
        };
    }

    public get ifEmpty(): {
        /**
         * Replaces the contents of the stream with the given alternative if the stream is empty.
         */
        <A>(alternative: Iterable<A>): Jstream<T> | Jstream<A>;
        /**
         * Replaces the contents of the stream with the result of the given function if the stream is empty.
         */
        <A>(alternative: () => Iterable<A>): Jstream<T> | Jstream<A>;
    } {
        return <A>(
            alternative: Iterable<A> | (() => Iterable<A>)
        ): Jstream<T> | Jstream<A> => {
            return new Jstream<T | A>(
                {
                    expensiveSource: true,
                    infinite: this.properties.infinite,
                },
                () => {
                    const source = this.getSource();
                    const count = nonIteratedCountOrUndefined(source);

                    if (count !== undefined) {
                        if (count === 0) {
                            return resultOf(alternative);
                        } else {
                            return source;
                        }
                    }

                    return (function* () {
                        const iterator = source[Symbol.iterator]();
                        let next = iterator.next();
                        if (next.done) {
                            yield* resultOf(alternative);
                            return;
                        }

                        do {
                            yield next.value;
                        } while (!(next = iterator.next()).done);
                    })();
                }
            ) as Jstream<T> | Jstream<A>;
        };
    }

    // TODO better description
    /**
     * Flattens the stream.
     */
    public get flatten() {
        const self = this;
        return function flatten(): Jstream<
            T extends Iterable<infer SubT> ? SubT : T
        > {
            return new Jstream(
                { infinite: self.properties.infinite },
                function* () {
                    for (const item of self) {
                        if (isIterable(item)) {
                            yield* item as any;
                        } else {
                            yield item;
                        }
                    }
                }
            );
        };
    }

    /**
     * Splits the collection on the deliminator.
     * Equivalent to {@link String.split} except that regular expressions aren't supported.
     */
    public get split() {
        const self = this;
        const externalSplit = split;
        return function split<O>(
            deliminator: Iterable<O>,
            equalityChecker?: (t: T, o: O) => boolean
        ): Jstream<T[]> {
            return new Jstream({ infinite: self.properties.infinite }, () =>
                externalSplit(self, deliminator, equalityChecker)
            );
        };
    }

    /**
     * Concatenates to the end of the stream any items that aren't already in the stream.
     */
    public get including() {
        return <O>(other: Iterable<O>): Jstream<T | O> => {
            if (other === this) return this as Jstream<T | O>;

            const self = this;

            return new Jstream(
                {
                    infinite:
                        this.properties.infinite ||
                        (other instanceof Jstream && other.isInfinite),
                },
                function* () {
                    const otherSet = new Set<any>(other);
                    for (const item of self) {
                        yield item;
                        otherSet.delete(item);
                    }

                    for (const item of otherSet) {
                        yield item;
                    }
                }
            );
        };
    }

    // TODO docs
    public get zipLoose() {
        const self = this;
        return function zipLoose<O>(other: Iterable<O>) {
            return new Jstream(
                {
                    infinite:
                        self.properties.infinite ||
                        (other instanceof Jstream && other.isInfinite),
                },
                function* () {
                    const iterator = self[Symbol.iterator]();
                    const otherIterator = other[Symbol.iterator]();

                    while (true) {
                        let next = iterator.next();
                        let otherNext = otherIterator.next();
                        if (next.done) {
                            while (!otherNext.done) {
                                yield otherNext.value;
                            }
                            break;
                        }
                        if (otherNext.done) {
                            while (!next.done) {
                                yield next.value;
                            }
                            break;
                        }
                        yield next.value;
                        yield otherNext.value;
                    }
                }
            );
        };
    }

    // TODO docs
    public get zip() {
        const self = this;
        return function zip<O>(other: Iterable<O>) {
            return new Jstream(
                {
                    infinite:
                        self.properties.infinite &&
                        other instanceof Jstream &&
                        other.isInfinite,
                },
                function* () {
                    const iterator = self[Symbol.iterator]();
                    const otherIterator = other[Symbol.iterator]();

                    while (true) {
                        let next = iterator.next();
                        let otherNext = otherIterator.next();
                        if (next.done || otherNext.done) {
                            break;
                        }
                        yield next.value;
                        yield otherNext.value;
                    }
                }
            );
        };
    }

    public get merge(): {
        <O, R>(
            other: Iterable<O>,
            merger: (t: T, o: O, index: number) => R
        ): Jstream<R>;
        <O>(other: Iterable<O>): Jstream<readonly [T, O]>;
    } {
        const self = this;
        return function merge<O>(
            other: Iterable<O>,
            merger: (t: T, o: O, index: number) => any = (t, o) => [t, o]
        ) {
            return new Jstream(
                {
                    infinite:
                        self.properties.infinite &&
                        other instanceof Jstream &&
                        other.properties.infinite,
                },
                function* () {
                    const iteratorT = self[Symbol.iterator]();
                    const iteratorO = other[Symbol.iterator]();

                    let i = 0;
                    while (true) {
                        const nextT = iteratorT.next();
                        const nextO = iteratorO.next();
                        if (nextT.done || nextO.done) break;
                        yield merger(nextT.value, nextO.value, i);
                        i++;
                    }
                }
            );
        };
    }

    public get mergeLoose(): {
        <O, R>(
            other: Iterable<O>,
            merger: (t: T | undefined, o: O | undefined, index: number) => R
        ): Jstream<R>;
        <O>(other: Iterable<O>): Jstream<
            readonly [T | undefined, O | undefined]
        >;
    } {
        const self = this;
        return function merge<O>(
            other: Iterable<O>,
            merger: (
                t: T | undefined,
                o: O | undefined,
                index: number
            ) => any = (t, o) => [t, o]
        ) {
            return new Jstream(
                {
                    infinite:
                        self.properties.infinite &&
                        other instanceof Jstream &&
                        other.properties.infinite,
                },
                function* () {
                    const iteratorT = self[Symbol.iterator]();
                    const iteratorO = other[Symbol.iterator]();
                    let nextT = iteratorT.next();
                    let nextO = iteratorO.next();

                    let i = 0;
                    while (!nextT.done && !nextO.done) {
                        yield merger(nextT.value, nextO.value, i);
                        nextT = iteratorT.next();
                        nextO = iteratorO.next();
                        i++;
                    }
                    while (!nextT.done) {
                        yield nextT.value;
                        nextT = iteratorT.next();
                    }
                    while (!nextO.done) {
                        yield nextO.value;
                        nextO = iteratorO.next();
                    }
                }
            );
        };
    }

    public get interleave() {
        const self = this;
        return function interleave<O>(items: Iterable<O>): Jstream<T | O> {
            return new Jstream(
                { infinite: self.properties.infinite },
                function* () {
                    const iterator = self[Symbol.iterator]();

                    const itemsCached = memoizeIterable(items);

                    const next = iterator.next();
                    if (next.done) return;

                    yield next.value;
                    for (
                        let next = iterator.next();
                        !next.done;
                        next = iterator.next()
                    ) {
                        yield* itemsCached;
                        yield next.value;
                    }
                }
            );
        };
    }

    /**
     * Iterates the {@link Jstream}, caching the result. Returns a {@link Jstream} over that cached result.
     */
    public get collapse() {
        return (): Jstream<T> => {
            if (this.properties.infinite) {
                throw new NeverEndingOperationError(
                    "cannot collapse infinite items"
                );
            }
            return Jstream.from(this.toArray());
        };
    }

    /**
     * @returns a {@link Jstream} that will cache the original Jstream the first time it is iterated.
     * This cache is iterated on subsequent iterations instead of the original.
     */
    public get memoize() {
        const self = this;
        return function memoize(): Jstream<T> {
            return new Jstream(
                { infinite: self.properties.infinite },
                returns(memoizeIterable(self))
            );
        };
    }

    // =======================
    // reduction to non-stream
    // =======================

    /**
     * @returns The first item or undefined if empty.
     */
    public get first() {
        const self = this;
        return function first(): T | undefined {
            for (const item of self) return item;
            return undefined;
        };
    }

    /**
     * @returns The final item or undefined if empty.
     */
    public get final() {
        const self = this;
        return function final(): T | undefined {
            self.requireThisNotInfinite(
                "cannot find final item of infinite items"
            );

            let final: T | undefined = undefined;
            for (const item of self) final = item;
            return final;
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
            reducer: (result: General<T>, item: T, index: number) => General<T>
        ): General<T>;

        /**
         * Reduces the stream to a single value in the same way as {@link Jstream.reduce}.
         * The difference is that the given finalize function is called on the result.
         * The result of this function is returned instead of the original result.
         * @param finalize Applied to the result and the number of items in the stream. The result of this is what gets returned.
         */
        <F>(
            reducer: (result: General<T>, item: T, index: number) => General<T>,
            finalize: (result: General<T>, count: number) => F
        ): F;
    } {
        const self = this;
        return function reduce<F = General<T>>(
            reducer: (result: General<T>, item: T, index: number) => General<T>,
            finalize?: (result: General<T>, count: number) => F
        ): F {
            self.requireThisNotInfinite("cannot reduce infinite items");
            const iterator = self[Symbol.iterator]();
            let next = iterator.next();

            // TODO maybe just return undefined instead
            if (next.done) {
                throw new Error(
                    "cannot reduce empty iterable. no initial value"
                );
            }

            let result: General<T> = next.value as General<T>;

            let i = 1;
            while (!(next = iterator.next()).done) {
                result = reducer(result, next.value, i);

                i++;
            }

            if (finalize !== undefined) {
                return finalize(result, i);
            } else {
                return result as F;
            }
        };
    }

    public get fold(): {
        /**
         * Reduces the stream in the same way as {@link Jstream.reduce}.
         * The difference is the given initialValue is used in place of the first value in the fist call to the given reducer function:
         * reducer(initialValue, first, 0). The index given corresponding to the item given to the function.
         * Unlike {@link Jstream.reduce}, an Error isn't thrown in the case of an empty stream. The initial value is returned instead.
         */
        <R>(
            initialValue: R,
            reducer: (result: R, item: T, index: number) => R
        ): R;

        /**
         * Reduces the stream in the same way as {@link Jstream.fold}.
         * The difference is that the given finalize function is called on the result.
         * The result of this function is returned instead of the original result.
         * @param finalize Applied to the result and the number of items in the stream;
         * this count only includes values from the stream, it does not include the initial
         * value given to the function. The result of this is what gets returned.
         */
        <R, F>(
            initialValue: R,
            reducer: (result: R, item: T, index: number) => R,
            finalize: (result: R, count: number) => F
        ): F;
    } {
        const self = this;
        return function fold<R, F = R>(
            initialValue: R,
            reducer: (result: R, item: T, index: number) => R,
            finalize?: (result: R, count: number) => F
        ): F | R {
            if (self.properties.infinite) {
                throw new NeverEndingOperationError(
                    "cannot fold infinite items"
                );
            }
            let result = initialValue;

            let i = 0;
            for (const item of self) {
                result = reducer(result, item, i);
                i++;
            }

            if (finalize !== undefined) {
                return finalize(result, i);
            } else {
                return result;
            }
        };
    }

    /**
     * Counts the number of items in the stream. This will usually require iterating the stream.
     * To avoid this, consider using {@link Jstream.nonIteratedCountOrUndefined}.
     *
     * @returns The number of items in the stream. {@link Infinity} If the {@link Jstream} is known to be infinite.
     */
    public get count() {
        return (): number => {
            if (this.properties.infinite) {
                return Infinity;
            }
            const source = this.getSource();
            const nonIteratedCount = nonIteratedCountOrUndefined(source);

            if (nonIteratedCount !== undefined) {
                return nonIteratedCount;
            } else {
                let count = 0;
                for (const _ of source) count++;
                return count;
            }
        };
    }

    /**
     * @returns the number of items in the stream if this can be determined without iterating it. Returns undefined otherwise. {@link Infinity} If the {@link Jstream} is known to be infinite.
     */
    public get nonIteratedCountOrUndefined() {
        return (): number | undefined => {
            if (this.properties.infinite) {
                return Infinity;
            }
            if (this.properties.expensiveSource) return undefined;
            const source = this.getSource();
            return nonIteratedCountOrUndefined(source);
        };
    }

    /**
     * Copies the stream into an Array.
     * @returns The Array. As this is a copy of the stream, it is safe to modify.
     */
    public get toArray() {
        return (): T[] => {
            if (this.properties.infinite) {
                throw new NeverEndingOperationError(
                    "cannot collect infinite items into an array"
                );
            }
            const source = this.getSource();
            if (this.properties.freshSource && Array.isArray(source)) {
                return source;
            } else {
                return toArray(source);
            }
        };
    }

    /**
     * Creates an Array view of the stream. This will usually entail copying the
     * stream into an Array like {@link Jstream.toArray} but not always so the
     * result is not safe to modify.
     * @returns A readonly array containing the contents of the stream.
     */
    public get asArray() {
        return (): readonly T[] => {
            if (this.properties.infinite) {
                throw new NeverEndingOperationError(
                    "cannot collect infinite items into an array"
                );
            }
            const source = this.getSource();
            if (Array.isArray(source)) {
                return source;
            } else {
                return toArray(source);
            }
        };
    }

    /**
     * Copies the stream into a {@link Set}.
     * @returns The {@link Set}. As this is a copy of the stream, it is safe to modify.
     */
    public get toSet() {
        return (): Set<T> => {
            if (this.properties.infinite) {
                throw new NeverEndingOperationError(
                    "cannot collect infinite items into a set"
                );
            }
            const source = this.getSource();
            if (this.properties.freshSource && source instanceof Set) {
                return source;
            } else {
                return toSet(source);
            }
        };
    }

    /**
     * Creates a {@link Set} view of the stream. This will usually entail copying the stream into a Set like {@link Jstream.toSet} but not always so the result is not safe to modify.
     * @returns A readonly {@link Set} containing the contents of the stream.
     */
    public get asSet() {
        return (): ReadonlySet<T> => {
            if (this.properties.infinite) {
                throw new NeverEndingOperationError(
                    "cannot collect infinite items into a set"
                );
            }
            const source = this.getSource();
            if (source instanceof Set) {
                return source;
            } else {
                return new Set(source);
            }
        };
    }

    public get toMap(): {
        /**
         * Copies the stream into a {@link Map}.
         * @returns The {@link Map}. As this is a copy of the stream, it is safe to modify.
         */
        (): AsMap<Iterable<T>>;

        /**
         * Copies the stream into a {@link Map}.
         * @returns The {@link Map}. As this is a copy of the stream, it is safe to modify.
         *
         * @param keySelector Not used.
         * @param valueSelector Maps each item in the stream to its value in the {@link Map}.
         */
        <V>(
            keySelector: undefined,
            valueSelector: (item: T, index: number) => V
        ): AsMapWithValue<Iterable<T>, V>;

        /**
         * Copies the stream into a {@link Map}.
         * @returns The {@link Map}. As this is a copy of the stream, it is safe to modify.
         *
         * @param keySelector Maps each item in the stream to its key in the {@link Map}.
         */
        <K>(keySelector: (item: T, index: number) => K): AsMapWithKey<
            Iterable<T>,
            K
        >;

        /**
         * Copies the stream into a {@link Map}.
         * @returns The {@link Map}. As this is a copy of the stream, it is safe to modify.
         *
         * @param keySelector Maps each item in the stream to its key in the {@link Map}.
         * @param valueSelector Maps each item in the stream to its value in the {@link Map}.
         */
        <K, V>(
            keySelector: (item: T, index: number) => K,
            valueSelector: (item: T, index: number) => V
        ): Map<K, V>;

        /**
         * Copies the stream into a {@link Map}.
         * @returns The {@link Map}. As this is a copy of the stream, it is safe to modify.
         *
         * @param keySelector If provided: maps each item in the stream to its key in the {@link Map}.
         * @param valueSelector If provided: maps each item in the stream to its value in the {@link Map}.
         */
        <
            K = T extends EntryLikeKey<infer K> ? K : unknown,
            V = T extends EntryLikeValue<infer V> ? V : unknown
        >(
            keySelector?: (item: T, index: number) => K,
            valueSelector?: (item: T, index: number) => V
        ): Map<K, V>;
    } {
        return ((keySelector?: any, valueSelector?: any) => {
            if (this.properties.infinite) {
                throw new NeverEndingOperationError(
                    "cannot collect infinite items into a map"
                );
            }
            return toMap(this, keySelector, valueSelector);
        }) as any;
    }

    /**
     * Creates a {@link Map} view of the stream. This will usually entail copying the stream into a Map like {@link Jstream.toSet} but not always so the result is not safe to modify.
     * @returns A readonly {@link Map} containing the contents of the stream.
     */
    public get asMap() {
        return (): AsReadonly<AsMap<Iterable<T>>> => {
            if (this.properties.infinite) {
                throw new NeverEndingOperationError(
                    "cannot collect infinite items into a map"
                );
            }
            const source = this.getSource();
            if (source instanceof Map) {
                return source as any;
            } else {
                return toMap(source) as any;
            }
        };
    }

    public get toObject(): {
        /**
         * Copies the stream into an object.
         * @returns The object. As this is a copy of the stream, it is safe to modify.
         */
        (): ToObject<Iterable<T>>;

        /**
         * Copies the stream into an object.
         * @returns The object. As this is a copy of the stream, it is safe to modify.
         *
         * @param keySelector Not used.
         * @param valueSelector Maps each item in the stream to its value in the object.
         */
        <V>(
            keySelector: undefined,
            valueSelector: (item: T, index: number) => V
        ): ToObjectWithValue<Iterable<T>, V>;

        /**
         * Copies the stream into an object.
         * @returns The object. As this is a copy of the stream, it is safe to modify.
         *
         * @param keySelector Maps each item in the stream to its key in the object.
         */
        <K extends keyof any>(
            keySelector: (item: T, index: number) => K
        ): ToObjectWithKey<Iterable<T>, K>;

        /**
         * Copies the stream into an object.
         * @returns The object. As this is a copy of the stream, it is safe to modify.
         *
         * @param keySelector Maps each item in the stream to its key in the object.
         * @param valueSelector Maps each item in the stream to its value in the object.
         */
        <K extends keyof any, V>(
            keySelector: (item: T, index: number) => K,
            valueSelector: (item: T, index: number) => V
        ): Record<K, V>;

        /**
         * Copies the stream into an object.
         * @returns The object. As this is a copy of the stream, it is safe to modify.
         *
         * @param keySelector If provided: maps each item in the stream to its key in the object.
         * @param valueSelector If provided: maps each item in the stream to its value in the object.
         */
        <K extends keyof any, V>(
            keySelector?: (item: T, index: number) => K,
            valueSelector?: (item: T, index: number) => V
        ): Record<K, V>;
    } {
        return ((
            keySelector: (item: any, index: number) => keyof any = i => i?.[0],
            valueSelector: (item: any, index: number) => any = i => i?.[1]
        ): Record<keyof any, any> => {
            if (this.properties.infinite) {
                throw new NeverEndingOperationError(
                    "cannot collect infinite items into an object"
                );
            }
            const object: Record<keyof any, any> = {};

            let i = 0;
            for (const item of this) {
                const key = keySelector(item, i);
                const value = valueSelector(item, i);

                object[key] = value;

                i++;
            }

            return object;
        }) as any;
    }

    public get toArrayRecursive() {
        const toArrayRecursive = (): JstreamToArrayRecursive<Jstream<T>> => {
            this.requireThisNotInfinite(
                "cannot collect infinite items into an array"
            );
            return recursive(this) as any;
        };
        return toArrayRecursive;

        function test(item: any): item is Jstream<any> | any[] {
            return item instanceof Jstream || Array.isArray(item);
        }

        function recursive(items: Jstream<any> | readonly any[]): any[] {
            if (items instanceof Jstream) {
                const source = items.getSource();
                if (Array.isArray(source) && items.properties.freshSource) {
                    for (let i = 0; i < source.length; i++) {
                        const item = source[i];
                        if (test(item)) {
                            source[i] = recursive(item);
                        }
                    }
                    return source;
                } else {
                    return recursive([...source]);
                }
            }

            const result: any[] = [];

            for (const item of items) {
                if (test(item)) {
                    result.push(recursive(item));
                } else {
                    result.push(item);
                }
            }

            return result;
        }
    }

    public get asArrayRecursive() {
        const asArrayRecursive = (): JstreamAsArrayRecursive<Jstream<T>> => {
            this.requireThisNotInfinite(
                "cannot collect infinite items into an array"
            );

            return recursive(this);
        };
        return asArrayRecursive;

        function test(item: any): item is Jstream<any> | any[] {
            return item instanceof Jstream || Array.isArray(item);
        }

        function recursive(items: Iterable<any>): any {
            if (items instanceof Jstream) {
                const source = items.getSource();
                if (Array.isArray(source) && items.properties.freshSource) {
                    for (let i = 0; i < source.length; i++) {
                        const item = source[i];
                        if (test(item)) {
                            source[i] = recursive(item);
                        }
                    }
                    return source;
                } else {
                    return recursive(source);
                }
            }

            const result: any[] = [];
            let resultWasModified = false;

            for (const item of items) {
                if (test(item)) {
                    result.push(recursive(item));
                    resultWasModified = true;
                } else {
                    result.push(item);
                }
            }

            if (resultWasModified) {
                return result;
            } else {
                return items;
            }
        }
    }

    public get find(): {
        /**
         * Finds the first item in the stream that makes the given condition function return true.
         */
        (condition: (item: T, index: number) => boolean): T | undefined;

        /**
         * Finds the first item in the stream that makes the given condition function return true.
         * @param alternative If no item is found, this will be returned or the result of this will be returned if this is a function.
         */
        <A>(
            condition: (item: T, index: number) => boolean,
            alternative: A | (() => A)
        ): T | A;
    } {
        const self = this;
        return function find(
            condition: (item: T, index: number) => boolean,
            alternative?: any
        ): any {
            const source = self.getSource();
            if (Array.isArray(source) && alternative === undefined) {
                return source.find(condition);
            }

            let i = 0;
            for (const item of source) {
                if (condition(item, i)) return item;
                i++;
            }
            return resultOf(alternative);
        };
    }

    public get findFinal(): {
        /**
         * Finds the last item in the stream that makes the given condition function return true.
         */
        (condition: (item: T, index: number) => boolean): T | undefined;

        /**
         * Finds the last item in the stream that makes the given condition function return true.
         * @param alternative If no item is found, this will be returned or the result of this will be returned if this is a function.
         */
        <A>(
            condition: (item: T, index: number) => boolean,
            alternative: A | (() => A)
        ): T | A;
    } {
        const self = this;
        return function findFinal(
            condition: (item: T, index: number) => boolean,
            alternative?: any
        ) {
            if (self.properties.infinite) {
                throw new NeverEndingOperationError(
                    "cannot find the final item of infinite items"
                );
            }
            let i = 0;
            let result = resultOf(alternative);
            for (const item of self) {
                if (condition(item, i)) result = item;
                i++;
            }
            return result;
        };
    }

    public get min(): {
        /**
         * @returns The smallest item in the stream according to {@link smartComparator}
         * or undefined if the stream is empty.
         */
        (): T | undefined;
        /**
         * @returns The smallest item in the stream according to the given comparator or
         * undefined if the stream is empty.
         */
        (comparator: Comparator<T>): T | undefined;
        /**
         * @returns The smallest item in the stream according to the given key selector
         * and {@link smartComparator} or undefined if the stream is empty.
         */
        (keySelector: (item: T) => any): T | undefined;
        /**
         * Finds the smallest items in the stream using {@link smartComparator}.
         * @param count How many item to find (unless the stream has less items than that.)
         */
        (count: number | bigint): Jstream<T>;
        /**
         * Finds the smallest items in the stream using the given comparator.
         * @param count How many item to find (unless the stream has less items than that.)
         */
        (count: number | bigint, comparator: Comparator<T>): Jstream<T>;
        /**
         * Finds the smallest items in the stream using the mapping from the given key selector and {@link smartComparator}.
         * @param count How many item to find (unless the stream has less items than that.)
         */
        (count: number | bigint, keySelector: (item: T) => any): Jstream<T>;
    } {
        const self = this;
        const externalMin = min;
        return function min(
            ...args:
                | [count: number | bigint, order: Order<T>]
                | [count: number | bigint]
                | [order: Order<T>]
                | []
        ) {
            self.requireThisNotInfinite(
                "cannot find smallest of infinite items"
            );
            if (typeof args[0] === "number" || typeof args[0] === "bigint") {
                const [count, order = smartComparator] = args;
                if (count === Infinity) return self.sortBy(order);
                return new Jstream(
                    { expensiveSource: true, freshSource: true },
                    () => externalMin(self, count, order)
                );
            } else {
                const [order = smartComparator] = args;
                for (const first of externalMin(self, 1, order)) return first;
                return undefined;
            }
        } as any;
    }

    public get max(): {
        /**
         * @returns The largest item in the stream according to {@link smartComparator}
         * or undefined if the stream is empty.
         */
        (): T | undefined;
        /**
         * @returns The largest item in the stream according to the given comparator or
         * undefined if the stream is empty.
         */
        (comparator: Comparator<T>): T | undefined;
        /**
         * @returns The largest item in the stream according to the given key selector
         * and {@link smartComparator} or undefined if the stream is empty.
         */
        (keySelector: (item: T) => any): T | undefined;
        /**
         * Finds the largest items in the stream using {@link smartComparator}.
         * @param count How many item to find (unless the stream has less items than that.)
         */
        (count: number | bigint): Jstream<T>;
        /**
         * Finds the largest items in the stream using the given comparator.
         * @param count How many item to find (unless the stream has less items than that.)
         */
        (count: number | bigint, comparator: Comparator<T>): Jstream<T>;
        /**
         * Finds the largest items in the stream using the mapping from the given key selector and {@link smartComparator}.
         * @param count How many item to find (unless the stream has less items than that.)
         */
        (count: number | bigint, keySelector: (item: T) => any): Jstream<T>;
    } {
        const self = this;
        const externalMax = max;
        return function max(
            ...args:
                | [count: number | bigint, order: Order<T>]
                | [count: number | bigint]
                | [order: Order<T>]
                | []
        ) {
            self.requireThisNotInfinite(
                "cannot find smallest of infinite items"
            );
            if (typeof args[0] === "number" || typeof args[0] === "bigint") {
                const [count, order = smartComparator] = args;
                if (count === Infinity) return self.sortBy(order);
                return new Jstream(
                    { expensiveSource: true, freshSource: true },
                    () => externalMax(self, count, order)
                );
            } else {
                const [order = smartComparator] = args;
                for (const first of externalMax(self, 1, order)) return first;
                return undefined;
            }
        } as any;
    }

    /**
     * @returns Whether at least one item in the stream causes the given condition function to return true.
     */
    public get some() {
        return (
            condition: (item: T, index: number) => boolean = returns(true)
        ): boolean => {
            let i = 0;
            for (const item of this) {
                if (condition(item, i)) return true;
            }
            return false;
        };
    }

    /**
     * The inverse of {@link Jstream.some}.
     * @returns Whether no item in the stream causes the given condition function to return true.
     */
    public get none() {
        return (
            condition: (item: T, index: number) => boolean = returns(true)
        ): boolean => {
            return !this.some(condition);
        };
    }

    /**
     * @returns Whether every item in the stream causes the given condition function to return true.
     */
    public get every() {
        return (condition: (item: T, index: number) => boolean): boolean => {
            if (this.properties.infinite) {
                throw new NeverEndingOperationError();
            }
            let i = 0;
            for (const item of this) {
                if (!condition(item, i)) return false;
            }
            return true;
        };
    }

    /**
     * @returns Whether the {@link Jstream} and the given iterable contain the same items in the same order.
     * @param How to check whether to items are equal.
     */
    public get sequenceEquals() {
        return <O>(
            other: Iterable<O>,
            equalityChecker: (t: T, o: O) => boolean = (a, b) => Object.is(a, b)
        ): boolean => {
            if (this.properties.infinite) {
                throw new NeverEndingOperationError();
            }
            const source = this.getSource();
            // try to check length
            const nonIteratedCount = nonIteratedCountOrUndefined(source);
            if (nonIteratedCount !== undefined) {
                const otherNonIteratedCount =
                    nonIteratedCountOrUndefined(other);

                if (otherNonIteratedCount !== undefined) {
                    if (nonIteratedCount !== otherNonIteratedCount) {
                        return false;
                    }
                }
            }

            // check every item
            const iterator = source[Symbol.iterator]();
            const otherIterator = other[Symbol.iterator]();

            while (true) {
                const next = iterator.next();
                const otherNext = otherIterator.next();

                const nextDone = next.done;
                const otherNextDone = otherNext.done;

                if (nextDone || otherNextDone) {
                    return nextDone === otherNextDone;
                }

                if (!equalityChecker(next.value, otherNext.value)) {
                    return false;
                }
            }
        };
    }

    // TODO docs
    public get at() {
        const self = this;
        return function at(index: number | bigint): T | undefined {
            requireInteger(index);

            const source = self.getSource();
            if (isArray(source)) {
                return source.at(Number(index));
            } else if (index < 0) {
                self.requireThisNotInfinite(
                    "cannot index from the end of infinite items"
                );
                return toArray(source).at(Number(index));
            } else {
                let i = typeof index === "number" ? 0 : 0n;
                for (const item of source) {
                    if (i === index) return item;
                    i++;
                }
                return undefined;
            }
        };
    }

    /**
     * @returns The stream as an {@link AsyncJstream}.
     */
    public get toAsyncJstream() {
        const self = this;
        return function ToAsyncJstream(): AsyncJstream<T> {
            return new AsyncJstream(self.properties, self.getSource);
        };
    }

    public get makeString(): {
        /**
         * @returns The string values of each item in the stream concatenated together.
         */
        (): string;
        /**
         * @returns The string values of each item in the stream concatenated together with the string value of the given separator between them.
         */
        (separator: any): string;
        /**
         * @returns The string values of each item in the stream concatenated together with the string value of the given separator between them.
         * @param start Concatenated onto the start of the resulting string.
         */
        (start: any, separator: any): string;
        /**
         * @returns The string values of each item in the stream concatenated together with the string value of the given separator between them.
         * @param start Concatenated onto the start of the resulting string.
         * @param end Concatenated onto the end of the resulting string.
         */
        (start: any, separator: any, end: any): string;
    } {
        const self = this;
        const externalMakeString = makeString;
        return function makeString(
            ...args: [any, any, any] | [any, any] | [any] | []
        ): string {
            self.requireThisNotInfinite(
                "cannot collect infinite items into a string"
            );

            if (args.length === 0) {
                return externalMakeString(self.getSource());
            } else if (args.length === 1) {
                const separator = args[0];
                return externalMakeString(self.getSource(), separator);
            } else {
                const [start, separator, end] = args;
                return externalMakeString(
                    self.getSource(),
                    start,
                    separator,
                    end
                );
            }
        };
    }

    /**
     * @returns The stream as an array.
     */
    public get toJSON() {
        const self = this;
        return function (): readonly T[] {
            self.requireThisNotInfinite(
                "cannot collect infinite items into json"
            );

            return self.asArray();
        };
    }

    // ============
    // special
    // ===========
    /**
     * Call the given function with the {@link Jstream}.
     * @returns The result of the function.
     */
    public get applyTo() {
        const self = this;
        return function applyTo<R>(action: (stream: typeof self) => R): R {
            return action(self);
        };
    }

    // ===================
    // big and complicated
    // ===================
    // TODO documentation

    public get join(): {
        <O, R>(
            other: Iterable<O>,
            resultSelector: (item: T, otherItem: O) => R,
            comparison: (item: T, otherItem: O) => boolean
        ): Jstream<R>;

        <O, K, R>(
            other: Iterable<O>,
            keySelector: (item: T, index: number) => K,
            otherKeySelector: (item: O, index: number) => K,
            resultSelector: (item: T, otherItem: O) => R
        ): Jstream<R>;
    } {
        const self = this;
        return function join<O, K, R>(
            other: Iterable<O>,
            keySelectorOrResultSelector:
                | ((item: T, index: number) => K)
                | ((item: T, otherItem: O) => R),
            otherKeySelectorOrComparison:
                | ((item: O, index: number) => K)
                | ((item: T, otherItem: O) => boolean),
            resultSelector?: (item: T, otherItem: O) => R
        ): Jstream<R> {
            if (resultSelector !== undefined) {
                const keySelector = keySelectorOrResultSelector as (
                    item: T,
                    index: number
                ) => K;
                const otherKeySelector = otherKeySelectorOrComparison as (
                    item: O,
                    index: number
                ) => K;
                return new Jstream({ expensiveSource: true }, function* () {
                    const otherIndexed = toMap(
                        other,
                        otherKeySelector,
                        identity
                    );

                    let i = 0;
                    for (const item of self) {
                        const key = keySelector(item, i);
                        const otherItem = otherIndexed.get(key);
                        if (otherItem !== undefined) {
                            yield resultSelector(item, otherItem);
                        }
                        i++;
                    }
                });
            } else {
                const resultSelector = keySelectorOrResultSelector as (
                    item: T,
                    otherItem: O
                ) => R;
                const comparison = otherKeySelectorOrComparison as (
                    item: T,
                    otherItem: O
                ) => boolean;

                return new Jstream({ expensiveSource: true }, function* () {
                    const otherCached = toArray(other);

                    for (const item of self) {
                        for (const otherItem of otherCached) {
                            if (comparison(item, otherItem)) {
                                yield resultSelector(item, otherItem);
                            }
                        }
                    }
                });
            }
        };
    }

    public get leftJoin(): {
        <I, R>(
            inner: Iterable<I>,
            resultSelector: (item: T, innerItem: I | undefined) => R,
            comparison: (item: T, innerItem: I) => boolean
        ): Jstream<R>;

        <I, K, R>(
            inner: Iterable<I>,
            keySelector: (item: T, index: number) => K,
            innerKeySelector: (item: I, index: number) => K,
            resultSelector: (item: T, innerItem: I | undefined) => R
        ): Jstream<R>;
    } {
        const self = this;
        return function leftJoin<I, K, R>(
            inner: Iterable<I>,
            keySelectorOrResultSelector:
                | ((item: T, index: number) => K)
                | ((item: T, innerItem: I | undefined) => R),
            innerKeySelectorOrComparison:
                | ((item: I, index: number) => K)
                | ((item: T, innerItem: I) => boolean),
            resultSelector?: (item: T, innerItem: I | undefined) => R
        ): Jstream<R> {
            if (resultSelector !== undefined) {
                const keySelector = keySelectorOrResultSelector as (
                    item: T,
                    index: number
                ) => K;
                const innerKeySelector = innerKeySelectorOrComparison as (
                    item: I,
                    index: number
                ) => K;
                return new Jstream({ expensiveSource: true }, function* () {
                    const innerIndexed = toMap(
                        inner,
                        innerKeySelector,
                        identity
                    );

                    let i = 0;
                    for (const item of self) {
                        const key = keySelector(item, i);
                        const innerItem = innerIndexed.get(key);
                        yield resultSelector(item, innerItem);
                        i++;
                    }
                });
            } else {
                const resultSelector = keySelectorOrResultSelector as (
                    item: T,
                    innerItem: I | undefined
                ) => R;
                const comparison = innerKeySelectorOrComparison as (
                    item: T,
                    innerItem: I
                ) => boolean;

                return new Jstream({ expensiveSource: true }, function* () {
                    const innerCached = toArray(inner);

                    for (const item of self) {
                        let innerMatch: I | undefined = undefined;
                        for (const innerItem of innerCached) {
                            if (comparison(item, innerItem)) {
                                innerMatch = innerItem;
                                break;
                            }
                        }
                        yield resultSelector(item, innerMatch);
                    }
                });
            }
        };
    }

    public get groupJoin(): {
        <I, K, R>(
            inner: Iterable<I>,
            keySelector: (item: T, index: number) => K,
            innerKeySelector: (item: I, index: number) => K,
            resultSelector: (item: T, innerItem: I[]) => R
        ): Jstream<R>;

        <I, R>(
            inner: Iterable<I>,
            resultSelector: (item: T, innerItem: I[]) => R,
            comparison: (item: T, innerItem: I) => boolean
        ): Jstream<R>;
    } {
        const self = this;
        return function groupJoin<I, K, R>(
            inner: Iterable<I>,
            keySelectorOrResultSelector:
                | ((item: T, index: number) => K)
                | ((item: T, innerItem: I[]) => R),
            innerKeySelectorOrComparison:
                | ((item: I, index: number) => K)
                | ((item: T, innerItem: I) => boolean),
            resultSelector?: (item: T, innerItem: I[]) => R
        ): Jstream<R> {
            if (resultSelector !== undefined) {
                const keySelector = keySelectorOrResultSelector as (
                    item: T,
                    index: number
                ) => K;
                const innerKeySelector = innerKeySelectorOrComparison as (
                    item: I,
                    index: number
                ) => K;

                return new Jstream({}, function* () {
                    const innerGrouped = groupBy(inner, innerKeySelector);

                    let i = 0;
                    for (const item of self) {
                        const key = keySelector(item, i);
                        const innerGroup = innerGrouped.get(key) ?? [];
                        yield resultSelector(item, innerGroup);
                        i++;
                    }
                });
            } else {
                const resultSelector = keySelectorOrResultSelector as (
                    item: T,
                    innerItem: I[]
                ) => R;
                const comparison = innerKeySelectorOrComparison as (
                    item: T,
                    innerItem: I
                ) => boolean;

                return new Jstream({}, function* () {
                    const innerCached = toArray(inner);

                    for (const item of self) {
                        let innerGroup: I[] = [];
                        for (const innerItem of innerCached) {
                            if (comparison(item, innerItem)) {
                                innerGroup.push(innerItem);
                            }
                        }
                        yield resultSelector(item, innerGroup);
                    }
                });
            }
        };
    }
}

function asSortedJstreamProperties<T>(
    properties: JstreamProperties<T>
): SortedJstreamProperties<T> {
    if (properties.infinite) {
        throw new NeverEndingOperationError("cannot sort infinite items");
    }
    return properties as SortedJstreamProperties<T>;
}

export type SortedJstreamProperties<T> = JstreamProperties<T> & {
    readonly infinite?: false;
} & Readonly<
        Partial<{
            /** If true: the source has already been sorted by the order provided to the {@link SortedJstream}. */
            preSorted: boolean;
        }>
    >;

export class SortedJstream<T> extends Jstream<T> {
    /** the order to sort the items in */
    private readonly order: Order<T>;
    /** the original getSource function */
    private readonly getUnsortedSource: () => Iterable<T>;
    /** the properties of the original stream */
    private readonly unsortedProperties: SortedJstreamProperties<T>;

    public static empty<T>(order: Order<T> = smartComparator) {
        return new SortedJstream(
            order,
            { preSorted: true, freshSource: true },
            () => []
        );
    }

    public constructor(
        order: Order<T>,
        properties: SortedJstreamProperties<T> = {},
        getSource: () => Iterable<T>
    ) {
        if (properties.infinite) {
            throw new NeverEndingOperationError("cannot sort infinite items");
        }
        super({ expensiveSource: true, freshSource: true }, () => {
            const source = getSource();
            if (this.unsortedProperties.preSorted) return source;

            let arr: T[] = (() => {
                if (properties.freshSource && isArray(source)) {
                    return source;
                } else {
                    return toArray(source);
                }
            })();

            arr.sort(asComparator(this.order));
            return arr;
        });

        this.getUnsortedSource = getSource;
        this.unsortedProperties = properties;
        this.order = order;
    }

    public get thenBy(): {
        /** Sorts the stream by the given comparator in ascending order after all previous sorts. */
        (comparator: Comparator<T>): SortedJstream<T>;
        /** Sorts the stream by the result of the given mapping function using {@link smartComparator} in ascending order after all previous sorts. */
        (keySelector: (item: T) => any): SortedJstream<T>;
    } {
        const self = this;
        return function thenBy(order: Order<T>): SortedJstream<T> {
            return new SortedJstream<T>(
                multiCompare([self.order, order]),
                self.unsortedProperties,
                self.getUnsortedSource
            );
        };
    }

    public get thenByDescending(): {
        /** Sorts the stream by the given comparator in descending order after all previous sorts. */
        (comparator: Comparator<T>): SortedJstream<T>;
        /** Sorts the stream by the result of the given mapping function using {@link smartComparator} in descending order after all previous sorts. */
        (keySelector: (item: T) => any): SortedJstream<T>;
    } {
        const self = this;
        return function thenByDescending(order: Order<T>): SortedJstream<T> {
            return new SortedJstream<T>(
                multiCompare([self.order, reverseOrder(order)]),
                self.unsortedProperties,
                self.getUnsortedSource
            );
        };
    }

    /**
     * @returns the number of items in the stream if this can be determined without iterating it. Returns undefined otherwise. {@link Infinity} If the {@link Jstream} is known to be infinite.
     */
    public get nonIteratedCountOrUndefined() {
        return (): number | undefined => {
            if (this.unsortedProperties.infinite) return Infinity;
            if (!this.unsortedProperties.expensiveSource) {
                const count = nonIteratedCountOrUndefined(
                    this.getUnsortedSource()
                );
                if (undefined !== count) return count;
            }

            return super.nonIteratedCountOrUndefined();
        };
    }

    public get take() {
        const self = this;
        const externalTake = take;
        return function take(count: number | bigint): SortedJstream<T> {
            if (count === Infinity) return self;
            if (count === 0 || count === 0n) {
                return SortedJstream.empty(self.order);
            }
            requireNonNegative(count);
            requireInteger(count);

            return new SortedJstream(
                self.order,
                { preSorted: true, expensiveSource: true, freshSource: true },
                () => {
                    if (self.unsortedProperties.preSorted) {
                        return externalTake(self.getUnsortedSource(), count);
                    } else {
                        return min(self.getUnsortedSource(), count, self.order);
                    }
                }
            );
        };
    }

    public get skip() {
        const self = this;
        const externalSkip = skip;
        return function skip(count: number | bigint): SortedJstream<T> {
            return new SortedJstream(
                self.order,
                {
                    preSorted: true,
                    expensiveSource: true,
                    freshSource: true,
                },
                () => {
                    if (self.unsortedProperties.preSorted) {
                        return externalSkip(self.getUnsortedSource(), count);
                    }
                    const length = self.nonIteratedCountOrUndefined();
                    if (undefined !== length) {
                        return max(
                            self.getUnsortedSource(),
                            length - Number(count),
                            self.order
                        );
                    } else {
                        return externalSkip(self, count);
                    }
                }
            );
        };
    }
}
