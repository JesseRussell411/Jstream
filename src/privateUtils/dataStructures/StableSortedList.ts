import { Comparator } from "../../types/sorting";
import SortedSet from "collections/sorted-set";
type Group<T> = [T, ...T[]];

export default class StableSortedList<T> {
    private sortedSet: typeof SortedSet<Group<T>> extends {
        new (...args: any[]): infer Instance;
    }
        ? Instance
        : never;
    private maxLength: number;
    private length: number;
    private keepLeast: boolean;

    public constructor(
        comparator: Comparator<T>,
        maxLength: number = Infinity,
        keepLeast: boolean = true
    ) {
        const groupComparator = (a: Group<T>, b: Group<T>) =>
            comparator(a[0] as T, b[0] as T);

        this.sortedSet = new SortedSet(
            [],
            (a, b) => groupComparator(a, b) === 0,
            groupComparator
        );

        this.maxLength = maxLength;
        this.length = 0;
        this.keepLeast = keepLeast;
    }

    public add(item: T) {
        const isFull = this.length >= this.maxLength;
        const group = this.sortedSet.get([item]);
        if (group === undefined) {
            this.sortedSet.add([item]);
        } else {
            group.push(item);
        }

        if (isFull) {
            if (this.keepLeast) {
                const greatestGroup = this.sortedSet.findGreatest()!.value;
                if (greatestGroup.length === 1) {
                    this.sortedSet.remove(greatestGroup);
                } else {
                    greatestGroup.pop();
                }
            } else {
                const leastGroup = this.sortedSet.findLeast()!.value;
                if (leastGroup.length === 1) {
                    this.sortedSet.remove(leastGroup);
                } else {
                    // TODO find way to make this 0(1) like pop
                    leastGroup.shift();
                }
            }
        } else {
            this.length++;
        }
    }

    public toArray(): T[] {

        console.log("inside class",this.sortedSet.toArray());
        return (this.sortedSet.toArray() as Group<T>[]).flatMap(group => [
            ...group,
        ]);
    }
}
