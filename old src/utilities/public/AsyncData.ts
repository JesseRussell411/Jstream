import { asyncIterable, AsyncIteratorSource } from "./asyncIterable";
import { extractAsyncDeferredValue } from "./type";

export async function AsyncToArray<T>(
    source: AsyncIteratorSource<T>
): Promise<T[]> {
    const result: T[] = [];
    for await (const item of asyncIterable(source)) {
        result.push(item);
    }
    return result;
}

export async function AsyncAsArray<T>(
    source: AsyncIteratorSource<T>
): Promise<readonly T[]> {
    const extracted = await extractAsyncDeferredValue(source);
    if (Array.isArray(extracted)) {
        return extracted;
    } else {
        return await AsyncToArray(extracted);
    }
}
