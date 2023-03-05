/**
 * Ensures that the number is a whole number.
 * @throws If the number has a value to the right of the decimal point. If the number is not an integer.
 */
export function requireInteger<N extends number | bigint>(num: N): N {
    if (typeof num === "bigint") return num;
    if (num % 1 === 0) return num;
    throw new Error("expected an integer but got: " + num);
}

/**
 * Ensures that the number is zero or greater.
 * @throws If the number is negative.
 */
export function requireNonNegative<N extends number | bigint>(num: N): N {
    if (num < 0) {
        throw new Error("expected a non-negative number but got " + num);
    }

    return num;
}

/**
 * Ensures that the number is greater than zero (the mathematical definition of positive).
 * @throws If the number is zero or less.
 */
export function requireGreaterThanZero<N extends number | bigint>(num: N): N {
    if (num > 0) return num;
    throw new Error("expected a number greater than zero but got " + num);
}

/**
 * Ensures that the number is not zero.
 * @throws If the number is zero.
 */
export function requireNonZero<N extends number | bigint>(num: N): N {
    if (num === 0 || num === 0n) {
        throw new Error("expected non zero but got " + num);
    }
    return num;
}

/**
 * Ensures that the number is greater than or equal to {@link Number.MIN_SAFE_INTEGER}
 * and less than or equal to {@link Number.MAX_SAFE_INTEGER}.
 * @throws If the number is too big or too small to be safe.
 */
export function requireSafeNumber<N extends number | bigint>(number: N): N {
    if (number < Number.MIN_SAFE_INTEGER) {
        throw new Error(
            `${number} is less than the smallest safe integer: ${Number.MIN_SAFE_INTEGER}`
        );
    }
    if (number > Number.MAX_SAFE_INTEGER) {
        throw new Error(
            `${number} is greater than the largest safe integer: ${Number.MAX_SAFE_INTEGER}`
        );
    }
    return number;
}

/**
 * Ensures that the number is an integer greater than or equal to {@link Number.MIN_SAFE_INTEGER},
 * and less than or equal to {@link Number.MAX_SAFE_INTEGER}.
 * @throws If the number is too big or too small to be safe or if it is not an integer.
 */
export function requireSafeInteger<N extends number | bigint>(number: N): N {
    return requireInteger(requireSafeNumber(number));
}
