/**
 * Ensures that the number is a whole number.
 * @throws If the number has a value to the right of the decimal point. If the number is not an integer.
 */
export function requireInteger(num: number | bigint): number | bigint {
    if (typeof num === "bigint") return num;
    if (num % 1 === 0) return num;
    throw new Error("expected an integer but got: " + num);
}

/**
 * Ensures that the number is zero or greater.
 * @throws If the number is negative.
 */
export function requireNonNegative(num: number | bigint): number | bigint {
    if (num < 0) {
        throw new Error("expected a non-negative number but got " + num);
    }

    return num;
}

/**
 * Ensures that the number is greater than zero (the mathematical definition of positive).
 * @throws If the number is zero or less.
 */
export function requireGreaterThanZero(num: number | bigint): number | bigint {
    if (num > 0) return num;
    throw new Error("expected a number greater than zero but got " + num);
}

/**
 * Ensures that the number is not zero.
 * @throws If the number is zero.
 */
export function requireNonZero(num: number | bigint): number | bigint {
    if (num === 0 || num === 0n)
        throw new Error("expected non zero but got " + num);
    return num;
}
