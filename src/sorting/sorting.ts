import { Comparator, Order } from "../types/sorting";

/**
 * @returns Whether the {@link Order} is a comparator.
 */
export function isComparator<T>(order: Order<T>): order is Comparator<T> {
    // check how many arguments it takes. Comparators take 2, key selectors take 1.
    return order.length >= 2;
}

/**
 * Reverses the {@link Order}.
 * @returns A reversed {@link Comparator} from the {@link Order}.
 */
export function reverseOrder<T>(order: Order<T>): Comparator<T> {
    const comp = asComparator(order);
    return (a, b) => comp(b, a);
}

/**
 * @returns A comparator from the {@link Order}.
 */
export function asComparator<T>(order: Order<T>): Comparator<T> {
    if (isComparator(order)) {
        return order;
    } else {
        return (a, b) => smartComparator(order(a), order(b));
    }
}

//TODO better description:
/**
 * A much better default comparator.
 * Tries to sort things how you would expect them to be sorted. false comes before true, symbols are sorted by their description, etc.
 * numbers are sorted by their NUMERIC value not their ASCII value so 2 comes before 10 like it should (also, number and bigint are sorted together so 2n will come before 3 and 4n will come after 3, etc.).
 *
 * earlier {@link Date}s come before later {@link Date}s
 *
 * doesn't sort arrays, objects, or functions
 */
export function smartComparator(a: any, b: any): number {
    // TODO! add wrapper class support (Number, Boolean, etc.)

    // TYPE RATINGS:

    // undefined* -- 0
    // null       -- 1
    // boolean    -- 2

    // number     -- 3
    // bigint     -- 3

    // string     -- 4
    // symbol     -- 5
    // date       -- 6
    // array      -- 7
    // object     -- 8
    // function   -- 9

    // * -- Array.sort ignores undefined items and just puts them
    // all at the end regardless of the comparator, making this rating
    // effectively "for completeness" but otherwise pointless.

    // type
    const typeRatingA = rateType(a);
    const typeRatingB = rateType(b);

    // sort by type first
    if (typeRatingA !== typeRatingB) return typeRatingA - typeRatingB;

    // value
    switch (typeRatingA) {
        // undefined
        case 0:
            // pointless for reason stated above
            return 0;

        // null
        case 1:
            return 0;

        // boolean
        case 2:
            if (a === b) {
                return 0;
            } else if (a === true) {
                return 1;
            } else {
                return -1;
            }

        // number or bigint
        case 3:
            // TODO test performance difference

            // if (a < b) {
            //     return -1;
            // } else if (a > b) {
            //     return 1;
            // } else {
            //     return
            // }

            // if (typeof a === "number") {
            //     if (typeof b === "number") {
            //         return a - b;
            //     } else {
            //         return a - Number(b);
            //     }
            // } else {
            //     if (typeof b === "number") {
            //         return Number(a) - b;
            //     } else {
            //         return Number(a - b);
            //     }
            // }

            if (typeof a === "bigint" && typeof b === "bigint") {
                return Number(a - b);
            } else {
                return Number(a) - Number(b);
            }

        // string
        case 4:
            return (a as string).localeCompare(b as string);

        // symbol
        case 5:
            // don't sort symbols
            return 0;

        // date
        case 6:
            //TODO make sure this is how you compare dates in javascript
            return (
                (a as Date).getMilliseconds() - (b as Date).getMilliseconds()
            );

        // array
        case 7:
            // don't sort arrays
            return 0;

        // object
        case 8:
            // don't sort objects
            return 0;

        // function
        case 9:
            // don't sort functions
            return 0;
    }

    function rateType(item: any) {
        // TODO? move outside of parent function if better performance
        // TODO? replace switch with Map or object if better performance

        // special cases
        if (item === null) return 1;
        if (item instanceof Date) return 6;
        if (Array.isArray(item)) return 7;

        switch (typeof item) {
            // this case will actually be ignored by javascript
            // Array.sort doesn't actually sort undefined values.
            // It just puts all the undefineds at the end of the array even if the comparator says otherwise.
            case "undefined":
                return 0;

            // null -- 1

            case "boolean":
                return 2;

            case "number":
            case "bigint":
                return 3;

            case "string":
                return 4;

            case "symbol":
                return 5;

            // date -- 7

            // array -- 6

            case "object":
                return 8;

            case "function":
                return 9;
        }
    }
}

export function multiCompare<T>(orders: Iterable<Order<T>>): Comparator<T> {
    const comparators: Comparator<T>[] = [];
    for (const order of orders) {
        comparators.push(asComparator(order));
    }

    return (a: T, b: T) => {
        for (const comparator of comparators) {
            const cmp = comparator(a, b);
            if (cmp !== 0) return cmp;
        }

        return 0;
    };
}
