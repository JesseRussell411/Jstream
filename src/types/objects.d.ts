/** Removes readonly from all properties in T. Effectively the inverse of {@link Readonly} */
export type Modifiable<T> = {
    -readonly [P in keyof T]: T[P];
}

/** The value type of the given array type or object type. The value equivalent to keyof. */
export type ValueOf<O> = O extends readonly (infer T)[] ? T : O[keyof O];