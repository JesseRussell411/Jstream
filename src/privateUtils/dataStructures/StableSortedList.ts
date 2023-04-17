import { Comparator } from "../../types/sorting";
import AVLTree from "./AVLTree";
import DoubleLinkedList from "./DoubleLinkedList";
type Group<T> = DoubleLinkedList<T>;

export default class StableSortedList<T> implements Iterable<T> {
    private readonly sortedTree: AVLTree<T, Group<T>>;
    private readonly maxLength: number;
    private length: number = 0;
    private readonly keepLeast: boolean;

    public constructor(
        comparator: Comparator<T>,
        maxLength: number = Infinity,
        keepLeast: boolean = true
    ) {
        this.sortedTree = new AVLTree(comparator);
        this.maxLength = maxLength;
        this.keepLeast = keepLeast;
    }

    public *[Symbol.iterator](): Iterator<T> {
        for (const group of this.sortedTree) {
            yield* group[1];
        }
    }

    public add(item: T): void {
        const isFull = this.length >= this.maxLength;

        // add item
        const group = this.sortedTree.getValue(item);
        if (group === undefined) {
            this.sortedTree.put(item, DoubleLinkedList.of(item));
        } else {
            group.push(item);
        }

        // remove an item if full
        if (isFull) {
            if (this.keepLeast) {
                const greatest = this.sortedTree.getGreatest()!;
                const greatestGroup = greatest[1];
                if (greatestGroup.size === 1) {
                    this.sortedTree.remove(greatest[0]);
                } else {
                    greatestGroup.pop();
                }
            } else {
                const least = this.sortedTree.getLeast()!;
                const leastGroup = least[1];

                if (leastGroup.size === 1) {
                    this.sortedTree.remove(least[0]);
                } else {
                    leastGroup.shift();
                }
            }
        } else {
            this.length++;
        }
    }
}
