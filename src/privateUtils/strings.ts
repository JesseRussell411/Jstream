import { AwaitableIterable } from "../types/async";
import { isIterable } from "./typeGuards";

export function makeString(collection: Iterable<unknown>): string;

export function makeString(
    collection: Iterable<any>,
    separator: any
): string;

export function makeString(
    collection: Iterable<any>,
    start: any,
    separator: any,
    end?: any
): string;

export function makeString(collection: AsyncIterable<any>): Promise<string>;

export function makeString(
    collection: AsyncIterable<any>,
    separator: any
): Promise<string>;

export function makeString(
    collection: AsyncIterable<any>,
    start: any,
    separator: any,
    end?: any
): Promise<string>;

export function makeString(
    collection: AwaitableIterable<any>
): string | Promise<string>;

export function makeString(
    collection: AwaitableIterable<any>,
    separator: any
): string | Promise<string>;

export function makeString(
    collection: AwaitableIterable<any>,
    start: any,
    separator: any,
    end?: any
): string | Promise<string>;

export function makeString(
    collection: AwaitableIterable<unknown>,
    startOrSeparator: unknown = "",
    separator: unknown = "",
    end: unknown = ""
): string | Promise<string> {
    if (arguments.length === 2) {
        const separator = startOrSeparator;
        return makeString(collection, "", separator, "");
    }

    const start = startOrSeparator;

    if (typeof start !== "string")
        return makeString(collection, `${start}`, separator, end);

    if (typeof separator !== "string")
        return makeString(collection, start, `${separator}`, end);

    if (typeof end !== "string")
        return makeString(collection, start, separator, `${end}`);

    if (typeof collection === "string" && separator === "") {
        if (start === "" && end === "") {
            return collection;
        } else if (start === "") {
            return collection + end;
        } else if (end === "") {
            return start + collection;
        } else {
            return start + collection + end;
        }
    }

    if (isIterable(collection)) {
        // collection is not async

        // TODO test performance difference
        // return start + [...collection].join(separator) + end;

        const builder: unknown[] = [start];

        const iterator = collection[Symbol.iterator]();
        let next = iterator.next();

        if (!next.done) {
            builder.push(next.value);

            while (!(next = iterator.next()).done) {
                builder.push(separator);
                builder.push(next.value);
            }
        }

        builder.push(end);
        return builder.join("");
    } else {
        // collection is an async iterable
        return (async () => {

            const builder: unknown[] = [start];

            const iterator = collection[Symbol.asyncIterator]();
            let next = await iterator.next();

            if (!next.done) {
                builder.push(next.value);

                while (!(next = await iterator.next()).done) {
                    builder.push(separator);
                    builder.push(next.value);
                }
            }

            builder.push(end);
            return builder.join("");
        })();
    }
}
