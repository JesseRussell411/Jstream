/** Compares two items by returning a number. If the item is 0 the values are equal. If it's negative, the first item is smaller than the second. If it's positive, the first item is larger than the second. */
export type Comparator<T> = (a: T, b: T) => number;
/** Represents an ordering of a collection of items of the given type. */
export type Order<T> = Comparator<T> | ((item: T) => any);
