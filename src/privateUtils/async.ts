import { doNothing } from "./functional";

export class Deferred<T> extends Promise<T> {
    private _resolve: (value: T | PromiseLike<T>) => void = doNothing;
    private _reject: (reason?: any) => void = doNothing;

    public get resolve(): (value: T | PromiseLike<T>) => void {
        return this._resolve;
    }

    public get reject(): (reason?: any) => void {
        return this._reject;
    }

    public constructor(
        executer?: (
            resolve: (value: T | PromiseLike<T>) => void,
            reject: (reason?: any) => void
        ) => void
    ) {
        super((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
            executer?.(resolve, reject);
        });
    }
}
