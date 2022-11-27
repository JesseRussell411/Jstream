// TODO docs
export type DeferredValue<T> = T | (() => T);
// TODO docs
export type AsyncDeferredValue<T> = Promise<T>| T | (() => T | Promise<T>);

// TODO docs
export function isIterable<T>(
    item: T
): item is T extends Iterable<any> ? T : never {
    return typeof (item as any)?.[Symbol.iterator] === "function";
}

// TODO docs
export function isAsyncIterable<T>(
    item: T
): item is T extends AsyncIterable<any> ? T : never {
    return typeof (item as any)?.[Symbol.asyncIterator] === "function";
}

// TODO docs
export function extractAsyncDeferredValue<T>(
    asyncDeferredValue: AsyncDeferredValue<T>
): T | Promise<T> {
    if (asyncDeferredValue instanceof Function) {
        return asyncDeferredValue();
    } else {
        return asyncDeferredValue;
    }
}

// TODO docs
export function extractDeferredValue<T>(deferredValue: DeferredValue<T>): T {
    if (deferredValue instanceof Function) {
        return deferredValue();
    } else {
        return deferredValue;
    }
}

// TODO docs
export type Replace<T, A, B> = T extends A ? B : T;

// TODO docs
export type ValueOf<T> = T extends (infer V)[]
    ? V
    : T extends Iterable<infer V>
    ? V
    : T extends Record<keyof any, infer V>
    ? V
    : T[keyof T];

// TODO docs
export type RealKey<K> = Replace<K, number, string>;
// TODO docs
export type RealKeyOf<T> = RealKey<keyof T>;

// TODO docs
export type DigitCharacter =
    | "0"
    | "1"
    | "2"
    | "3"
    | "4"
    | "5"
    | "6"
    | "7"
    | "8"
    | "9";
// TODO docs
export type IntCharacter = DigitCharacter | "-";
// TODO docs
export type NumberCharacter = IntCharacter | ".";

// TODO docs
export type WhitespaceCharacter = " " | "\n" | "\t" | "\r" | "\v" | "\f";

// TODO docs
export type IsWhitespaceOnly<T> = T extends WhitespaceCharacter
    ? true
    : T extends `${WhitespaceCharacter}${infer Rest}`
    ? IsWhitespaceOnly<Rest>
    : false;

// TODO docs
export type IsNegative<N extends number | bigint> = IsLiteral<N> extends false
    ? boolean
    : `${N}` extends `-${infer _}`
    ? true
    : false;

// TODO docs
export type IsInt<N extends number | bigint> = N extends bigint
    ? true
    : IsNumberLiteral<N> extends false
    ? boolean
    : `${N}` extends `${infer _}.${infer _0}`
    ? false
    : true;

// TODO docs
export type Includes<
    Haystack extends string,
    Needle extends string | number | bigint | boolean | null | undefined
> = Haystack extends `${string}${Needle}${string}` ? true : false;

// TODO docs
export type IsStringLiteral<T> = T extends `${infer _}` ? true : false;

// TODO docs
export type IsNumberLiteral<T> = T extends number
    ? `${T}` extends `${NumberCharacter}${infer _}`
        ? true
        : false
    : false;

// TODO docs
export type IsBigIntLiteral<T> = T extends bigint
    ? `${T}` extends `${IntCharacter}${infer _}`
        ? true
        : false
    : false;

// TODO docs
export type IsLiteral<T> = IsStringLiteral<T> extends true
    ? true
    : IsNumberLiteral<T> extends true
    ? true
    : IsBigIntLiteral<T> extends true
    ? true
    : false;

// TODO docs
export type GenericNumberString<N extends number | bigint> =
    `${N}` extends `${infer S}n` ? S : `${N}`;

// TODO docs
export type Extends<A, B> = A extends B ? true : false;

// TODO docs
export type And<A extends boolean, B extends boolean> = A extends true
    ? B extends true
        ? true
        : false
    : false;

// TODO docs
export type Or<A extends boolean, B extends boolean> = A extends true
    ? true
    : B extends true
    ? true
    : false;

// TODO docs
export type Xor<A extends boolean, B extends boolean> = A extends true
    ? B extends true
        ? false
        : true
    : B extends true
    ? true
    : false;

// TODO docs
export type Not<B extends boolean | undefined> = B extends true
    ? false
    : B extends false
    ? true
    : undefined;

type TupleOfLength_definition<
    Length extends number | bigint,
    T,
    Accumulator extends T[] = []
> = IsLiteral<Length> extends false
    ? T[]
    : IsNegative<Length> extends true
    ? never
    : IsInt<Length> extends false
    ? never
    : `${Accumulator["length"]}` extends GenericNumberString<Length>
    ? Accumulator
    : TupleOfLength_definition<Length, T, [...Accumulator, T]>;

// TODO docs
export type TupleOfLength<
    Length extends number | bigint,
    T = undefined
> = TupleOfLength_definition<Length, T>;

type ArrayMathHack_IsInputSanitary<
    A extends number | bigint,
    B extends number | bigint
> = IsLiteral<A> extends false
    ? false
    : IsInt<A> extends false
    ? false
    : IsNegative<A> extends true
    ? false
    : IsLiteral<B> extends false
    ? false
    : IsInt<B> extends false
    ? false
    : IsNegative<B> extends true
    ? false
    : true;

// TODO docs
export type Add<
    A extends number | bigint,
    B extends number | bigint
> = A extends bigint
    ? B extends bigint
        ? bigint
        : number
    : B extends bigint
    ? number
    : ArrayMathHack_IsInputSanitary<A, B> extends false
    ? number
    : [...TupleOfLength<A>, ...TupleOfLength<B>]["length"];

type Subtract_definition<
    A extends number | bigint,
    B extends number | bigint,
    Gap extends any[] = []
> = A extends bigint
    ? B extends bigint
        ? bigint
        : number
    : B extends bigint
    ? number
    : ArrayMathHack_IsInputSanitary<A, B> extends false
    ? number
    : [...TupleOfLength<B>, ...Gap]["length"] extends A
    ? Gap["length"]
    : Subtract_definition<A, B, [...Gap, any]>;

// TODO docs
export type Subtract<A extends number | bigint, B extends number | bigint> = Subtract_definition<
    A,
    B
>;

// TODO docs
export type Eq<A extends number | bigint, B extends number | bigint> = And<
    IsLiteral<A>,
    IsLiteral<B>
> extends false
    ? boolean
    : GenericNumberString<A> extends GenericNumberString<B>
    ? true
    : false;

type Lt_definition<
    A extends number | bigint,
    B extends number | bigint,
    Gap extends any[] = [any]
> = Or<Extends<A, bigint>, Extends<B, bigint>> extends true
    ? boolean
    : ArrayMathHack_IsInputSanitary<A, B> extends false
    ? boolean
    : A extends B
    ? false
    : [...TupleOfLength<A>, ...Gap]["length"] extends B
    ? true
    : [...TupleOfLength<B>, ...Gap]["length"] extends A
    ? false
    : Lt_definition<A, B, [...Gap, any]>;

// TODO docs
export type Lt<
    A extends number | bigint,
    B extends number | bigint
> = Lt_definition<A, B, [any]>;

// TODO docs
export type Gt<A extends number | bigint, B extends number | bigint> = Not<
    Or<Lt<A, B>, Eq<A, B>>
>;

// TODO docs
export type Lte<A extends number | bigint, B extends number | bigint> = Or<
    Lt<A, B>,
    Eq<A, B>
>;
// TODO docs
export type Gte<A extends number | bigint, B extends number | bigint> = Or<
    Gt<A, B>,
    Eq<A, B>
>;

// TODO docs
export type deferredSource<T> = T | Promise<T> | (() => T | Promise<T>);

type Abs_definition<
    N extends number | bigint,
    result extends number
> = IsLiteral<N> extends false
    ? N
    : IsNegative<N> extends false
    ? N
    : N extends bigint
    ? bigint
    : `${N}` extends `-${result}`
    ? result
    : Abs_definition<N, Add<result, 1>>;

// TODO docs
export type Abs<N extends number | bigint> = Abs_definition<N, 0>;

// TODO docs
export type Sign<N extends number | bigint> = IsLiteral<N> extends false
    ? -1 | 0 | 1
    : IsNegative<N> extends true
    ? -1
    : Eq<N, 0> extends true
    ? 0
    : 1;
