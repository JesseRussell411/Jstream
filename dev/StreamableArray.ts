import Jstream from "../src/Jstream";

export default class StreamableArray<T> extends Array<T> {
    public constructor(length: number | bigint){
        super(Number(length));
    }

    public get stream(): Jstream<T>{
        return new Jstream({}, () => this)
    }
}