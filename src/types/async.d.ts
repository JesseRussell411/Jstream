/** either a promise of the given type or just the given type. */
export type Awaitable<T> = T | Promise<T>