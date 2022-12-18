export function requireInteger(num: number | bigint): number | bigint {
    if (typeof num === "bigint") return num;
    if (num % 1 === 0) return num;
    throw new Error("expected an integer but got: " + num);
}

export function requireNonNegative(num: number | bigint): number | bigint {
    if (num < 0) {
        throw new Error("expected a non-negative number but got " + num);
    }

    return num;
}

export function requireGreaterThanZero(num: number | bigint): number | bigint {
    if (num > 0) return num;
    throw new Error("expected a number greater than zero but got " + num);
}