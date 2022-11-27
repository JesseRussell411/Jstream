import {
    asyncIterable,
    asyncIterator,
    AsyncIteratorSource,
} from "../public/asyncIterable";
import { require0OrGreater, requireInteger } from "../public/require";

export function asyncInsertMany<
    T,
    O,
    Overflow extends "pad" | "throw" | "truncate" = "throw"
>(
    collection: AsyncIteratorSource<T>,
    index: number | bigint,
    items: AsyncIteratorSource<O>,
    overflow: Overflow = "throw" as any
): AsyncIterable<T | O | Overflow extends "pad" ? undefined : never> {
    // TODO? allow negative index
    require0OrGreater(requireInteger(index));

    return asyncIterable(async function* () {
        let i = 0;

        const iterator = asyncIterator(collection);
        let next: IteratorResult<T>;

        while (!(next = await iterator.next()).done) {
            if (i < index) {
                yield next.value;
                i++;
            } else {
                break;
            }
        }

        if (overflow === "pad") {
            while (i < index) {
                yield undefined;
                i++;
            }
        } else if (overflow === "throw") {
            if (i < index) {
                throw new Error(
                    `asyncIterator reached end before insertion index ${index} could be reached`
                );
            }
        }

        yield* asyncIterable(items);

        while (!next.done) {
            yield next.value;
            next = await iterator.next();
        }
    }) as any;
}

export function asyncInsert<
    T,
    O,
    Overflow extends "pad" | "throw" | "truncate" = "throw"
>(
    collection: AsyncIteratorSource<T>,
    index: number | bigint,
    item: O,
    overflow: Overflow = "throw" as any
): AsyncIterable<T | Awaited<O> | Overflow extends "pad" ? undefined : never> {
    return asyncInsertMany(
        collection,
        index,
        (async () => [await item])(),
        overflow
    );
}
