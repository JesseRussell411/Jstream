import { Comparator, Order } from "../types/sorting";

/**
 * @returns Whether the {@link Order} is a comparator.
 */
export function isComparator<T>(order: Order<T>): order is Comparator<T> {
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
 * Generally tries to sort things how you would expect them to be sorted. false comes before true, symbols are sorted by their description, etc.
 * numbers are sorted by their NUMERIC value not their ASCII value so 2 comes before 10 like it should (also, number and bigint are sorted together so 2n will come before 3 and 4n will come after 3, etc.).
 * Sorts arrays by their length
 * earlier {@link Date}s come before later {@link Date}s
 * doesn't attempt to sort objects
 * sorts functions by number of parameters
 */
export function smartComparator(a: any, b: any) {
    // TODO! add wrapper class support (Number, Boolean, etc.)

    // TYPE RATINGS:

    // null       -- 1
    // boolean    -- 2

    // number     -- 3
    // bigint     -- 3

    // string     -- 4
    // symbol     -- 5
    // array      -- 6
    // date       -- 7
    // object     -- 8
    // function   -- 9
    // undefined* -- 10

    // * -- Array.sort ignores undefined items and just puts them
    // all at the end regardless of the comparator, making this rating
    // effectively "for completeness" but otherwise pointless.

    // type
    const typeRatingA = rateType(a);
    const typeRatingB = rateType(b);
    if (typeRatingA !== typeRatingB) return typeRatingA - typeRatingB;

    // value
    switch (typeRatingA) {
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
            // if (a < b){
            //     return -1;
            // } else if (a > b) {
            //     return 1;
            // } else {
            //     return
            // }
            if (typeof a === "number") {
                if (typeof b === "number") {
                    return a - b;
                } else {
                    return a - Number(b);
                }
            } else {
                if (typeof b === "number") {
                    return Number(a) - b;
                } else {
                    return Number(a - b);
                }
            }

        // string
        case 4:
            return (a as string).localeCompare(b as string);

        // symbol
        case 5:
            const symbolA = a as Symbol;
            const symbolB = b as Symbol;

            if (symbolA.description === undefined) {
                if (symbolB.description === undefined) {
                    return 0;
                } else {
                    // send un-labeled symbols to start of ascending sort
                    return -1;
                }
            } else if (symbolB.description === undefined) {
                // send un-labeled symbols to start of ascending sort
                return 1;
            } else {
                return symbolA.description.localeCompare(symbolB.description);
            }

        // array
        case 6:
            return (a as any[]).length - (b as any[]).length;

        // date
        case 7:
            //TODO make sure this is how you compare dates in javascript
            return (
                (a as Date).getMilliseconds() - (b as Date).getMilliseconds()
            );

        // object
        case 8:
            // not even attempted
            return 0;

        // function
        case 9:
            // sort by number of parameters
            return (a as Function).length - (b as Function).length;

        // undefined
        case 10:
            // pointless for reason stated above
            return 0;
    }

    function rateType(item: any) {
        // TODO? move outside of parent function if better performance
        // TODO? replace switch with Map or object if better performance

        // special cases
        if (item === null) return 1;
        if (Array.isArray(item)) return 6;
        if (item instanceof Date) return 7;

        switch (typeof item) {
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

            // array -- 6

            // date -- 7

            case "object":
                return 8;

            case "function":
                return 9;

            // this case will actually be ignored by javascript
            // Array.sort doesn't actually sort undefined values.
            // It just puts all the undefineds at the end of the array even if the comparator says otherwise.
            case "undefined":
                return 10;
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
            if (cmp != 0) return cmp;
        }

        return 0;
    };
}
