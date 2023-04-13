/**
 * Ensures that the number is finite.
 * @throws If the number is positive or negative infinity or NaN.
 */
export function requireFinite<N extends number | bigint>(num: N): N {
    if (typeof num === "bigint") return num;
    if (Number.isFinite(num)) return num;
    throw new Error("expected a finite number but got " + num);
}

/**
 * Ensures that the number is not {@link NaN}.
 * @throws If the number is NaN.
 */
export function requireNonNaN<N extends number | bigint>(num: N): N {
    if (typeof num === "bigint") return num;
    if (isNaN(num)) throw new Error("expected a number but got NaN");
    return num;
}

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
 * Ensures that the number is a whole number or that it is infinity or negative infinity.
 * @throws If the number has a value to the right of the decimal point. If the number is not an integer.
 */
export function requireIntegerOrInfinity<N extends number | bigint>(num: N): N {
    if (typeof num === "bigint") return num;
    if (num === Infinity || num === -Infinity) return num;
    if (num % 1 === 0) return num;
    throw new Error("expected an integer or infinity but got: " + num);
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
 * Ensures that the number is less than zero.
 * @throws If the number is non-negative.
 */
export function requireNegative<N extends number | bigint>(num: N): N {
    if (num >= 0) {
        throw new Error("expected a negative number but got " + num);
    }

    return num;
}

/**
 * Ensures that the number is greater than zero.
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
    if (num !== 0 && num !== 0n) {
        return num;
    }
    throw new Error("expected non zero but got " + num);
}

/**
 * Ensures that the number is greater than or equal to {@link Number.MIN_SAFE_INTEGER}
 * and less than or equal to {@link Number.MAX_SAFE_INTEGER}.
 * @throws If the number is too big or too small to be safe. Will also throw if the number is {@link NaN}.
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

    if (typeof number === "number" && isNaN(number)) {
        throw new Error(
            "expected number between smallest and largest safe integers but got NaN"
        );
    }

    return number;
}

export function requireSafeNumberOrInfinity<N extends number | bigint>(
    number: N
): N {
    if (number === Infinity || number === -Infinity) return number;
    return requireSafeNumber(number);
}

/**
 * Ensures that the number is an integer greater than or equal to {@link Number.MIN_SAFE_INTEGER},
 * and less than or equal to {@link Number.MAX_SAFE_INTEGER}.
 * @throws If the number is too big or too small to be safe or if it is not an integer. Will also throw for {@link NaN}.
 */
export function requireSafeInteger<N extends number | bigint>(number: N): N {
    return requireInteger(requireSafeNumber(number));
}

export function requireSafeIntegerOrInfinity<N extends number | bigint>(
    number: N
): N {
    if (number === Infinity || number === -Infinity) return number;
    return requireSafeInteger(number);
}

type RequireNumber = {
    <N extends number | bigint>(n: N): N;
    finite: RequireNumber;
    nonNaN: RequireNumber;
    integer: RequireNumber;
    nonNegative: RequireNumber;
    greaterThanZero: RequireNumber;
    nonZero: RequireNumber;
    safeNumber: RequireNumber;
    safeInteger: RequireNumber;
};

export const requireNumberToBe: RequireNumber = ((n: any) => n) as any;
addStuff(requireNumberToBe);
function addStuff(object: any) {
    Object.defineProperties(object, {
        finite: {
            get() {
                const result = function finite(n: number | bigint) {
                    // @ts-ignore
                    return requireFinite(object(n));
                };
                addStuff(result);
                return result;
            },
        },
        nonNaN: {
            get() {
                const result = function nonNaN(n: number | bigint) {
                    // @ts-ignore
                    return requireNonNaN(object(n));
                };
                addStuff(result);
                return result;
            },
        },
        integer: {
            get() {
                const result = function integer(n: number | bigint) {
                    // @ts-ignore
                    return requireInteger(object(n));
                };
                addStuff(result);
                return result;
            },
        },
        nonNegative: {
            get() {
                const result = function nonNegative(n: number | bigint) {
                    // @ts-ignore
                    return requireNonNegative(object(n));
                };
                addStuff(result);
                return result;
            },
        },
        negative: {
            get() {
                const result = function negative(n: number | bigint) {
                    // @ts-ignore
                    return requireNegative(object(n));
                };
                addStuff(result);
                return result;
            },
        },
        greaterThanZero: {
            get() {
                const result = function greaterThanZero(n: number | bigint) {
                    // @ts-ignore
                    return requireGreaterThanZero(object(n));
                };
                addStuff(result);
                return result;
            },
        },
        nonZero: {
            get() {
                const result = function nonZero(n: number | bigint) {
                    // @ts-ignore
                    return requireNonZero(object(n));
                };
                addStuff(result);
                return result;
            },
        },
        safeNumber: {
            get() {
                const result = function safeNumber(n: number | bigint) {
                    // @ts-ignore
                    return requireSafeNumber(object(n));
                };
                addStuff(result);
                return result;
            },
        },
        safeInteger: {
            get() {
                const result = function safeInteger(n: number | bigint) {
                    // @ts-ignore
                    return requireSafeInteger(object(n));
                };
                addStuff(result);
                return result;
            },
        },
    });
}
