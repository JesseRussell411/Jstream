// avl tree implementation with no dependencies

// TODO red-black tree, better memory usage

export type Entry<K, V> = readonly [key: K, value: V];

export default class AVLTree<K, V> implements Iterable<Entry<K, V>> {
    private root: Node<K, V> | undefined;
    private comparator: (a: K, b: K) => number;
    private _size: number = 0;

    public get size() {
        return this._size;
    }

    public constructor(comparator: (a: K, b: K) => number) {
        this.comparator = comparator;
    }

    public *[Symbol.iterator]() {
        if (undefined === this.root) return;
        for (const node of this.root) {
            yield node.entry;
        }
    }

    /**
     * Inserts the key into the tree.
     *
     * @returns Whether the key wasn't already in the tree.
     *
     * @param key The key to insert.
     * @param overwrite If the key is already in the tree, it is overwritten with the output of this function. Defaults to overwriting the existing key.
     */
    public put(
        key: K,
        value: V,
        overwrite: (
            /** The value to the key that is already in the tree */
            existingValue: V,
            /** The key that is already in the tree. */
            existingKey: K,
            /** The value that was suppose to be inserted. */
            value: V,
            /** The key that was suppose to be inserted. */
            key: K
        ) => V = () => value
    ): boolean {
        // if root is null, add root node
        if (undefined === this.root) {
            this.root = new Node(key, value);
            this._size++;
            return true;
        } else {
            // if root is not null, insert into root
            const result = this.root.locateOrInsert(
                this.comparator,
                key,
                value
            );

            // if the key was not already in the tree, increment size
            if (result.inserted) {
                this._size++;
                return true;
            } else {
                // if the key was already in the tree, use overwrite callback to decide what to do
                result.location.value = overwrite(
                    result.location.value,
                    result.location.key,
                    value,
                    key
                );
                return false;
            }
        }
    }

    public getValue(key: K): V | undefined {
        return this.root?.locate(this.comparator, key)?.value ?? undefined;
    }

    public getKey(key: K): K | undefined {
        return this.root?.locate(this.comparator, key)?.key ?? undefined;
    }

    public getEntry(key: K): Entry<K, V> | undefined {
        return this.root?.locate(this.comparator, key)?.entry ?? undefined;
    }

    public getKeyOrPut(key: K, newValue: V | (() => V)): K {
        return this.locateOrInsert(key, newValue).location.key;
    }

    public getValueOrPut(key: K, newValue: V | (() => V)): V {
        return this.locateOrInsert(key, newValue).location.value;
    }

    public getEntryOrPut(key: K, newValue: V | (() => V)): Entry<K, V> {
        return this.locateOrInsert(key, newValue).location.entry;
    }

    public hasKey(key: K): boolean {
        return this.root?.locate(this.comparator, key) !== undefined;
    }

    /**
     * @returns The entry that was removed or undefined if the key wasn't found and no entry was removed.
     */
    public remove(key: K): Entry<K, V> | undefined {
        let removedNode: Node<K, V> | undefined;

        this.root = this.root?.remove(
            this.comparator,
            key,
            removed => (removedNode = removed)
        );

        if (undefined !== removedNode) this._size--;

        return removedNode?.entry;
    }

    public getGreatest(): Entry<K, V> | undefined {
        return this.root?.rightMostSubNode.entry;
    }

    public getLeast(): Entry<K, V> | undefined {
        return this.root?.leftMostSubNode.entry;
    }

    public *getRange(lowerBound: K, upperBound: K): Generator<Entry<K, V>> {
        if (undefined === this.root) return;
        for (const node of this.root.range(
            this.comparator,
            lowerBound,
            upperBound
        )) {
            yield node.entry;
        }
    }

    private locateOrInsert(
        key: K,
        newValue: V | (() => V)
    ): Readonly<{ inserted: boolean; location: Node<K, V> }> {
        if (undefined === this.root) {
            this.root = new Node(key, resultOf(newValue));
            this._size++;
            return { inserted: true, location: this.root };
        }

        const result = this.root.locateOrInsert(this.comparator, key, newValue);
        if (result.inserted) this._size++;
        return result;
    }
}

function calcBalanceFactor(
    left: Node<any, any> | undefined,
    right: Node<any, any> | undefined
) {
    return (right?._depth ?? 0) - (left?._depth ?? 0);
}

function calcDepth(
    left: Node<any, any> | undefined,
    right: Node<any, any> | undefined
) {
    return Math.max(right?.depth ?? -1, left?.depth ?? -1) + 1;
}

class Node<K, V = undefined> implements Iterable<Node<K, V>> {
    //@ts-ignore
    key: K;
    //@ts-ignore
    _value: V;
    //@ts-ignore
    _left: Node<K, V> | undefined;
    //@ts-ignore
    _right: Node<K, V> | undefined;
    _balanceFactor: number;
    _depth: number;

    public get value() {
        return this._value;
    }

    public set value(value: V) {
        if (undefined !== value) this._value = value;
    }

    public get entry(): Entry<K, V> {
        return [this.key, this.value];
    }

    public get left() {
        return this._left;
    }

    public set left(left: Node<K, V> | undefined) {
        this._left = left;
        this.update();
    }

    public get right() {
        return this._right;
    }

    public set right(right: Node<K, V> | undefined) {
        this._right = right;
        this.update();
    }

    public get balanceFactor() {
        return this._balanceFactor;
    }

    public get depth() {
        return this._depth;
    }

    public constructor(
        key: K,
        value: V,
        left: Node<K, V> | undefined = undefined,
        right: Node<K, V> | undefined = undefined
    ) {
        if (undefined !== key) this.key = key;
        if (undefined !== value) this.value = value;
        if (undefined !== left) this._left = left;
        if (undefined !== right) this._right = right;
        this._balanceFactor = calcBalanceFactor(left, right);
        this._depth = calcDepth(left, right);
    }

    public *[Symbol.iterator](): Iterator<Node<K, V>> {
        // no worries of stack overflow because the depth cannot be more than log_2(2^64) or 64
        if (undefined !== this.left) yield* this.left;
        yield this;
        if (undefined !== this.right) yield* this.right;
    }

    public *range(
        comparator: (a: K, b: K) => number,
        lowerBound: K,
        upperBound: K
    ): Generator<Node<K, V>> {
        const upperBoundCmp = comparator(upperBound, this.key);
        if (upperBoundCmp <= 0) return;

        const lowerBoundCmp = comparator(lowerBound, this.key);

        if (lowerBoundCmp < 0 && undefined !== this.left) {
            yield* this.left.range(comparator, lowerBound, upperBound);
        }

        if (lowerBoundCmp === 0) {
            yield this;
        }

        if (undefined !== this.right) {
            yield* this.right.range(comparator, lowerBound, upperBound);
        }
    }

    public update(): void {
        this._balanceFactor = calcBalanceFactor(this._left, this._right);
        this._depth = calcDepth(this._left, this._right);
    }

    public rotateLeft(): Node<K, V> {
        // right shouldn't be undefined if this function is being called
        const right = this._right!;

        // a undefined reference exception will be thrown here, before this._right is set, if right is undefined
        // so it's safe not to check.
        this.right = right._left;
        right.left = this;
        return right;
    }

    public rotateRight(): Node<K, V> {
        // left shouldn't be undefined if this function is being called
        const left = this._left!;

        // a undefined reference exception will be thrown here, before this._left is set, if left is undefined
        // so it's safe not to check.
        this.left = left._right;
        left.right = this;
        return left;
    }

    /** The right most sub node to this node or this node if this node has no right subnode. */
    public get rightMostSubNode(): Node<K, V> {
        let result: Node<K, V> = this;
        while (undefined !== result.right) {
            result = result.right;
        }
        return result;
    }

    /** The left most sub node to this node or this node if this node has no left subnode. */
    public get leftMostSubNode(): Node<K, V> {
        let result: Node<K, V> = this;
        while (undefined !== result.left) {
            result = result.left;
        }
        return result;
    }

    public balance(): this {
        if (this.balanceFactor < -1) {
            if (undefined !== this.left && this.left.balanceFactor > 0) {
                // left right case
                this.left.rotateLeft();
                this.rotateRight();
            } else {
                // left left case:
                this.rotateRight();
            }
        } else if (this.balanceFactor > 1) {
            if (undefined !== this.right && this.right.balanceFactor < 0) {
                // right left case:
                this.right.rotateRight();
                this.rotateLeft();
            } else {
                // right right case:
                this.rotateLeft();
            }
        }

        return this;
    }

    public locate(
        comparator: (a: K, b: K) => number,
        key: K
    ): Node<K, V> | undefined {
        const cmp = comparator(key, this.key);
        if (cmp < 0) {
            if (undefined !== this.left) {
                return this.left.locate(comparator, key);
            } else {
                return undefined;
            }
        } else if (cmp > 0) {
            if (undefined !== this.right) {
                return this.right.locate(comparator, key);
            } else {
                return undefined;
            }
        } else {
            return this;
        }
    }

    /**
     * @returns The node at which the key now exists.
     * @param comparator
     * @param key
     * @param newKey
     */
    public locateOrInsert(
        comparator: (a: K, b: K) => number,
        key: K,
        newValue: V | (() => V)
    ): Readonly<{ inserted: boolean; location: Node<K, V> }> {
        const cmp = comparator(key, this.key);
        if (cmp < 0) {
            if (undefined === this.left) {
                this.left = new Node(key, resultOf(newValue));
                return { inserted: true, location: this.left };
            } else {
                const result = this.left.locateOrInsert(
                    comparator,
                    key,
                    newValue
                );
                if (result.inserted) this.balance();
                return result;
            }
        } else if (cmp > 0) {
            if (undefined === this.right) {
                this.right = new Node(key, resultOf(newValue));
                return { inserted: true, location: this.right };
            } else {
                const result = this.right.locateOrInsert(
                    comparator,
                    key,
                    newValue
                );
                if (result.inserted) this.balance();
                return result;
            }
        } else {
            return { inserted: false, location: this };
        }
    }

    /**
     * @returns The replacement for this node
     */
    public remove(
        comparator: (a: K, b: K) => number,
        key: K,
        getRemovedNode: (removed: Node<K, V>) => void = () => {}
    ): Node<K, V> | undefined {
        const cmp = comparator(key, this.key);
        if (cmp < 0) {
            if (undefined === this.left) return this;
            this.left = this.left.remove(comparator, key, getRemovedNode);
            this.balance();
            return this;
        } else if (cmp > 0) {
            if (undefined === this.right) return this;
            this.right = this.right.remove(comparator, key, getRemovedNode);
            this.balance();
            return this;
        } else {
            getRemovedNode(this);
            if (undefined === this.left) {
                if (undefined === this.right) {
                    // no successors
                    return undefined;
                } else {
                    // right successor
                    return this.right;
                }
            } else if (undefined === this.right) {
                // left successor
                return this.left;
            } else {
                // two possible successors
                const successor = this.right.leftMostSubNode;
                successor._left = this.left;
                successor._right = this.right.remove(comparator, successor.key);
                successor.update();
                successor.balance();
                return successor;
            }
        }
    }
}

function resultOf<T>(valueOrGetter: T | (() => T)): T {
    if (valueOrGetter instanceof Function) {
        return valueOrGetter();
    } else {
        return valueOrGetter;
    }
}
