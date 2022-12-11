import { isAsyncFunction } from "util/types";
import { isAsyncIterable, isIterable } from "./privateUtils/typeGuards";

export class SuperStream<T, Source extends Iterable<T> | AsyncIterable<T>> {
    public getSource: () => Source;

    public constructor(getSource: () => Source) {
        this.getSource = getSource;
        isAsyncFunction;
    }

    public map<R>(
        mapping: (item: T) => R
    ): SuperStream<
        R,
        Source extends AsyncIterable<T> ? AsyncIterable<R> : Iterable<R>
    > {
        const source = this.getSource();
        if (isAsyncIterable(source)) {
            return new SuperStream(async function* () {
                for await (const item of source) {
                    yield mapping(item as T);
                }
            }) as any;
        } else if (isIterable(source)) {
            return new SuperStream(function* () {
                for (const item of source) {
                    yield mapping(item as T);
                }
            }) as any;
        } else throw new Error();
    }

    public toArray(): Source extends AsyncIterable<T> ? Promise<T[]> : T[] {
        const source = this.getSource();
        if (isAsyncIterable(source)) {
            return (async () => {
                const arr: T[] = [];
                for await (const item of source) {
                    arr.push(item as T);
                }
                return arr;
            })() as any;
        } else if (isIterable(source)) {
            return [...source] as any;
        } else throw new Error();
    }
}





const ss = new SuperStream<number, AsyncIterable<number>>(async function*(){
    yield 1;
    yield 2;
    yield 3;
    yield 4;
})

const arrp = ss.toArray();
