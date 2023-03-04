import { ValueOf } from "../types/objects";

export function getOwnPropertyKeys<K extends keyof any>(
    object: Record<K, any>
): (K & (string | symbol))[] {
    return [
        ...Object.getOwnPropertyNames(object),
        ...Object.getOwnPropertySymbols(object),
    ] as any;
}

export function getOwnEntries<K extends keyof any, V>(
    object: Record<K, any>
): [K & (string | symbol), V][] {
    return [
        ...Object.getOwnPropertyNames(object).map(n => [n, (object as any)[n]]),
        ...Object.getOwnPropertySymbols(object).map(s => [
            s,
            (object as any)[s],
        ]),
    ] as any;
}

/** Runtime equivalent to {@link Pick}. */
export function pick<
    O extends object,
    F extends readonly (keyof O & (string | symbol))[]
>(object: O, fields: F): Pick<O, ValueOf<F>> {
    const result: any = {};
    const ownKeys = new Set(Reflect.ownKeys(object));

    for (const field of fields) {
        if (ownKeys.has(field)) {
            result[field] = object[field];
        }
    }

    return result;
}
