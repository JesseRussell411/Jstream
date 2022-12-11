export function isAsyncIterable<T>(item: AsyncIterable<T> | any): item is AsyncIterable<T>;
export function isAsyncIterable(item: any): item is AsyncIterable<unknown>;
export function isAsyncIterable(item: any): item is AsyncIterable<unknown>{
    return item?.[Symbol.asyncIterator] instanceof Function;
}

export function isIterable<T>(item: Iterable<T> | any): item is Iterable<T>;
export function isIterable(item: any): item is Iterable<unknown>;
export function isIterable(item: any): item is Iterable<unknown>{
    return item?.[Symbol.iterator] instanceof Function;
}

export function isArray<T>(item: Iterable<T> | any): item is T[];
export function isArray(item: any): item is unknown[];
export function isArray(item: any): item is unknown[]{
    return Array.isArray(item);
}

export function isSet<T>(item: Iterable<T> | any): item is Set<T>;
export function isSet(item: any): item is Set<unknown>;
export function isSet(item: any): item is Set<unknown>{
    return item instanceof Set;
}
