import { signedIndexToIndex, subtract } from "./numerics";
import { Eq, IsInt, IsNegative, Or } from "./type";

export function require0OrGreater<N extends number | bigint>(
    num: N
): IsNegative<N> extends false ? N : never {
    if (num < 0) throw new Error(`expected 0 or greater but got ${num}`);
    else return num as any;
}

export function requireGreaterThan0<N extends number | bigint>(
    num: N
): Or<IsNegative<N>, Eq<N, 0>> extends false ? N : never {
    if (!(num > 0))
        throw new Error(`expected number greater than 0 but got ${num}`);
    else return num as any;
}

export function requireNegative<N extends number | bigint>(
    num: N
): IsNegative<N> extends true ? N : never {
    if (num >= 0) throw new Error(`expected negative number but gor ${num}`);
    else return num as any;
}

export function requireInteger<N extends number | bigint>(
    num: N
): IsInt<N> extends true ? N : never {
    if (typeof num === "bigint") return num as any;
    if (num % 1 === 0) return num as any;
    throw new Error(`expected integer but got ${num}`);
}

// TODO requireSignedIndexInBounds
// export function requireSignedIndexInBounds(
//     index: number | bigint,
//     length: number | bigint
// ): number | bigint {}
// TODO docs
export function requireNumberInBounds(
    lower: number | bigint,
    index: number | bigint,
    upper: number | bigint
): number | bigint;

// TODO docs
export function requireNumberInBounds(
    Index: number | bigint,
    Upper: number | bigint
): number | bigint;

export function requireNumberInBounds(
    lowerOrIndex: number | bigint,
    indexOrUpper: number | bigint,
    upper?: number | bigint
): number | bigint {
    if (upper === undefined) {
        return requireNumberInBounds(0, lowerOrIndex, indexOrUpper);
    } else {
        const lower = lowerOrIndex;
        const index = indexOrUpper;
        if (lower <= index && index < upper) {
            return index;
        } else {
            throw new Error(
                `index ${index} out of bounds: ${lower} <= i < ${upper}`
            );
        }
    }
}
