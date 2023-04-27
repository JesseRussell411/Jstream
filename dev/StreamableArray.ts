import Tstream from "../src/Tstream";

export default class StreamableArray<T> extends Array<T> {
    public constructor(length: number | bigint){
        super(Number(length));
    }

    public get stream(): Tstream<T>{
        return new Tstream({}, () => this)
    }
}