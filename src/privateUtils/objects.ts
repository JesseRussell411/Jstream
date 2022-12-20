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
