/** Does nothing. */
export function doNothing(): void {
    // doing nothing...
}

/** @returns The given item. */
export function identity<T>(item: T): T {
    return item;
}

/** @returns A function that returns the given item. */
export function returns<T>(item: T): () => T {
    return () => item;
}

/**
 * Creates a cached version of the given function.
 *
 * @returns The cached version of the function. The original function is
 * called once on the first call of the returned function and the result
 * is cached. Subsequent calls return the cached result of the first call
 * without calling the original function.
 *
 * Note that this function considers both returns and throws as output.
 * If the original function throws an error, the error will be cached,
 * thrown, and thrown again on all subsequent calls without calling
 * the original function again.
 */
export function lazy<R>(action: () => R): () => R {
    let supplier = () => {
        try {
            const result = action();
            supplier = () => result;
            return result;
        } catch (error) {
            supplier = () => {
                throw error;
            };
            throw error;
        }
    };

    return () => supplier();
}

/** @returns The value given or its result if it's a function. */
export function resultOf<T>(itemOrGetter: T | (() => T)): T {
    if (itemOrGetter instanceof Function) {
        return itemOrGetter();
    } else {
        return itemOrGetter;
    }
}
