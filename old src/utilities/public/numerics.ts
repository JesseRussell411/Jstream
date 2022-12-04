import { Abs, Add, Sign, Subtract } from "./type";

// TODO docs
export function abs<N extends number | bigint>(n: N): Abs<N> {
    if (n < 0) {
        return -n as any;
    } else {
        return n as any;
    }
}

// TODO docs
export function sign<N extends number | bigint>(n: N): Sign<N> {
    if (typeof n === "number") return Math.sign(n) as any;
    if (n < 0n) return -1 as any;
    if (n > 0n) return 1 as any;
    return 0 as any;
}

// TODO docs
export function add<A extends number | bigint, B extends number | bigint>(
    a: A,
    b: B
): Add<A, B> {
    if (typeof a === "bigint" && typeof b === "bigint") {
        return (a + b) as any;
    } else {
        return (Number(a) + Number(b)) as any;
    }
}

// TODO docs
export function subtract<A extends number | bigint, B extends number | bigint>(
    a: A,
    b: B
): Subtract<A, B> {
    if (typeof a === "bigint" && typeof b === "bigint") {
        return (a - b) as any;
    } else {
        return (Number(a) - Number(b)) as any;
    }
}

// TODO docs
export function signedIndexToIndex<
    I extends number | bigint,
    L extends number | bigint
>(
    signedIndex: I,
    length: L
): I extends bigint ? (L extends bigint ? bigint : number | bigint) : number {
    if (signedIndex < 0) {
        return add(length, signedIndex) as any;
    } else {
        return signedIndex as any;
    }
}
