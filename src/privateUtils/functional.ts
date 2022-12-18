/** Does nothing. */
export function doNothing(): void {
    // doing nothing...
}

/** Returns the item unchanged and does nothing else. */
export function identity<T>(item: T): T {
    return item;
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
        } catch (e) {
            supplier = () => {
                throw e;
            };
            throw e;
        }
    };

    return () => supplier();
}