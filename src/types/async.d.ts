/** Either a {@link Promise} of the given type or just the given type. */
export type Awaitable<T> = Promise<T> | T;

/** Either an {@link Iterable} or an {@link AsyncIterable} */
export type AwaitableIterable<T> = Iterable<T> | AsyncIterable<T>;

/** Either an {@link Iterator} or an {@link AsyncIterator} */
export type AwaitableIterator<T> = Iterator<T> | AsyncIterator<T>;
