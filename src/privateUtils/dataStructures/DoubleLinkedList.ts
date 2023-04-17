export default class DoubleLinkedList<T> implements Iterable<T> {
    private _tail?: _Node<T> = undefined;
    private _size: number = 0;

    public static from<T>(values: Iterable<T>) {
        const list = new DoubleLinkedList<T>();
        for (const value of values) {
            list.push(value);
        }
        return list;
    }

    public static of<T>(...values: T[]) {
        return DoubleLinkedList.from(values);
    }

    public get size() {
        return this._size;
    }

    /** The first item in the list. */
    public get head(): T | undefined {
        return this._tail?.next.value;
    }

    /** The final item in the list. */
    public get tail(): T | undefined {
        return this._tail?.value;
    }

    public get headNode(): Node<T> | undefined {
        return this._tail?.next;
    }

    public get tailNode(): Node<T> | undefined {
        return this._tail;
    }

    public *[Symbol.iterator](): Iterator<T> {
        if (this._tail === undefined) return;

        const head = this._tail.next;
        let current = head;

        do {
            yield current.value;
            current = current.next;
        } while (current !== head);
    }

    public *reversed(): Generator<T> {
        if (this._tail === undefined) return;

        let current = this._tail;
        do {
            yield current.value;
            current = current.prev;
        } while (current !== this._tail);
    }

    public push(value: T): void {
        if (undefined === this._tail) {
            this._tail = new _Node(value);
        } else {
            const head = this._tail.next;

            const newTail = new _Node(
                value,
                // link new tail to old tail
                this._tail,
                // link new tail to head
                head
            );
            // link head to new tail
            head.prev = newTail;
            // link old tail to new tail
            this._tail.next = newTail;
            // replace old tail with new tail
            this._tail = newTail;
        }
        this._size++;
    }

    public unShift(value: T): void {
        if (undefined === this._tail) {
            this._tail = new _Node(value);
        } else {
            const head = this._tail.next;
            const newHead = new _Node(
                value,
                // link tail to new head
                this._tail,
                // link new head to old head
                head
            );
            // link old head to new head
            head.prev = newHead;
            // replace old head with new head
            this._tail.next = newHead;
        }
        this._size++;
    }

    /**
     * Remove head item from list and return it. Returns undefined if the list is empty.
     */
    public shift(): T | undefined {
        if (undefined === this._tail) return undefined;

        const head = this._tail.next;
        const result = head.value;

        if (head === this._tail) {
            this._tail === undefined;
        } else {
            const newHead = head.next;
            // link new head to tail
            newHead.prev = this._tail;
            // link tail to new head
            this._tail.next = head.next;
        }
        this._size--;
        return result;
    }

    /**
     * Removes the tail item from the list and returns it. Returns undefined if the list is empty.
     */
    public pop(): T | undefined {
        if (undefined === this._tail) return undefined;

        const result = this._tail.value;

        const head = this._tail.next;

        if (this._tail === head) {
            this._tail = undefined;
        } else {
            const newTail = this._tail.prev;
            // link new tail to head
            newTail.next = head;
            // link head to new tail
            head.prev = newTail;

            this._tail = newTail;
        }
        this._size--;
        return result;
    }
}

export interface Node<T> {
    readonly value: T;
    readonly prev: Node<T>;
    readonly next: Node<T>;
}

class _Node<T> implements Node<T> {
    public value: T;
    public prev: _Node<T>;
    public next: _Node<T>;

    public constructor(value: T, prev?: _Node<T>, next?: _Node<T>) {
        this.value = value;
        this.prev = prev ?? this;
        this.next = next ?? this;
    }
}
