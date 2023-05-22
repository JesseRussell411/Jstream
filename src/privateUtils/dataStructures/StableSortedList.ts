import { Comparator } from "../../types/sorting";
import AVLTree from "./AVLTree";
/**
 * A list who's contests are sorted by their value first and their insertion time second, providing a stable sort.
 * 
 * This sorting is the iteration order of the list.
 */
export default class StableSortedList<T> implements Iterable<T> {
    private readonly sortedTree: AVLTree<{ item: T; index: bigint }, undefined>;
    private readonly maxLength: number;
    private readonly keepLeast: boolean;
    private readonly comparator: (a: T, b: T) => number;
    private index: bigint = 0n;

    public get size() {
        return this.sortedTree.size;
    }

    public constructor(
        comparator: Comparator<T>,
        maxLength: number = Infinity,
        keepLeast: boolean = true
    ) {
        this.sortedTree = new AVLTree((a, b) => {
            const cmp = comparator(a.item, b.item);
            if (cmp !== 0) return cmp;
            else return Number(a.index - b.index);
        });
        this.maxLength = maxLength;
        this.keepLeast = keepLeast;
        this.comparator = comparator;
    }

    public *[Symbol.iterator](): Iterator<T> {
        for (const entry of this.sortedTree) {
            yield entry[0].item;
        }
    }

    public add(item: T): void {
        if (this.maxLength <= 0) return;
        const isFull = this.sortedTree.size >= this.maxLength;

        // cache greatest or least entries since they'll be needed twice
        const greatest =
            isFull && this.keepLeast
                ? this.sortedTree.getGreatest()
                : undefined;
        const least =
            isFull && !this.keepLeast
                ? this.sortedTree.getLeast() /** spacing for prettier */
                : undefined;

        // skip item if it would get removed anyway
        if (isFull) {
            if (this.keepLeast) {
                if (this.comparator(item, greatest![0].item) >= 0) return;
            } else {
                if (this.comparator(item, least![0].item) <= 0) return;
            }
        }

        // add item
        this.sortedTree.put({ item, index: this.index++ }, undefined);

        // remove an item if full
        if (isFull) {
            if (this.keepLeast) {
                this.sortedTree.remove(greatest![0]);
            } else {
                this.sortedTree.remove(least![0]);
            }
        }
    }
}
