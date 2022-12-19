/** Either a {@link Promise} of the given type or just the given type or a promise chain up to a depth of 8 of type T.*/
export type Awaitable<T> =
    | T
    | Promise<T>
    | Promise<Promise<T>>
    | Promise<Promise<Promise<T>>>
    | Promise<Promise<Promise<Promise<T>>>>
    | Promise<Promise<Promise<Promise<Promise<T>>>>>
    | Promise<Promise<Promise<Promise<Promise<Promise<T>>>>>>
    | Promise<Promise<Promise<Promise<Promise<Promise<Promise<T>>>>>>>
    | Promise<Promise<Promise<Promise<Promise<Promise<Promise<Promise<T>>>>>>>>;

// * tried this, didn't work ):
// export type Awaitable<T> = T | Promise<Awaitable<T>>

/** Either an {@link Iterable} or an {@link AsyncIterable} */
export type AwaitableIterable<T> = Iterable<T> | AsyncIterable<T>;

/** Either an {@link Iterator} or an {@link AsyncIterator} */
export type AwaitableIterator<T> = Iterator<T> | AsyncIterator<T>;
