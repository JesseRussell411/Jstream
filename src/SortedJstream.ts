import { isArray } from "./privateUtils/typeGuards";
import { Comparator, Order } from "./types/sorting";
import { multiCompare, reverseOrder } from "./sorting/sorting";
import Jstream, { JstreamProperties } from "./Jstream";


export class SortedJstream<T> extends Jstream<T> {
    /** the order to sort the items in */
    private readonly order: readonly Order<T>[];
    /** the order to sort the items in put into a comparator */
    private readonly comparator: Comparator<T>;
    /** the original getSource function */
    private readonly getUnsortedSource: () => Iterable<T>;
    /** the properties of the original stream */
    private readonly unsortedProperties: JstreamProperties<T>;

    public constructor(
        order: readonly Order<T>[],
        properties: JstreamProperties<T> = {},
        getSource: () => Iterable<T>
    ) {
        super(
            { standardSource: true, expensiveSource: true, freshSource: true },
            () => {
                const source = getSource();
                let arr: T[];
                if (properties.freshSource && isArray(source)) {
                    arr = source;
                } else {
                    arr = [...source];
                }
                arr.sort(this.comparator);
                return arr;
            }
        );

        this.getUnsortedSource = getSource;
        this.unsortedProperties = properties;
        this.order = order;
        this.comparator = multiCompare(order);
    }

    /** Sorts the stream by the given comparator in ascending order after all previous sorts. */
    public thenBy(comparator: Comparator<T>): SortedJstream<T>;
    /** Sorts the stream by the result of the given mapping function using {@link smartComparator} in ascending order after all previous sorts. */
    public thenBy(keySelector: (item: T) => any): SortedJstream<T>;
    public thenBy(order: Order<T>): SortedJstream<T> {
        return new SortedJstream<T>(
            [...this.order, order],
            this.unsortedProperties,
            this.getUnsortedSource
        );
    }

    /** Sorts the stream by the given comparator in descending order after all previous sorts. */
    public thenByDescending(comparator: Comparator<T>): SortedJstream<T>;
    /** Sorts the stream by the result of the given mapping function using {@link smartComparator} in descending order after all previous sorts. */
    public thenByDescending(keySelector: (item: T) => any): SortedJstream<T>;
    public thenByDescending(order: Order<T>): SortedJstream<T> {
        return new SortedJstream<T>(
            [...this.order, reverseOrder(order)],
            this.unsortedProperties,
            this.getUnsortedSource
        );
    }
}
