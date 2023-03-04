export class DoubleMap<A, B> implements Map<A, B> {
    private aIndex: Map<A, B>;
    private bIndex: Map<B, A>;

    public constructor();

    public constructor(
        aIndex: Map<A, B> = new Map(),
        bIndex: Map<B, A> = new Map()
    ) {
        this.aIndex = aIndex;
        this.bIndex = bIndex;
    }

    private static privateConstructor<A, B>(
        aIndex: Map<A, B>,
        bIndex: Map<B, A>
    ): DoubleMap<A, B> {
        return new (DoubleMap as { new (...args: any): any })(aIndex, bIndex);
    }

    flipped(): ReadonlyMap<B, A> {
        return DoubleMap.privateConstructor(this.bIndex, this.aIndex);
    }

    flip(): DoubleMap<B, A> {
        const aIndex = new Map<A, B>(this.aIndex);
        const bIndex = new Map<B, A>(this.bIndex);

        return DoubleMap.privateConstructor(bIndex, aIndex);
    }

    set(a: A, b: B): this {
        try {
            this.aIndex.set(a, b);
            this.bIndex.set(b, a);
        } catch (e) {
            this.aIndex.delete(a);
            this.bIndex.delete(b);
            throw e;
        }
        return this;
    }

    get(a: A): B | undefined {
        return this.getB(a);
    }

    getB(a: A): B | undefined {
        return this.aIndex.get(a);
    }

    getA(b: B): A | undefined {
        return this.bIndex.get(b);
    }

    keys(): IterableIterator<A> {
        return this.aIndex.keys();
    }

    values(): IterableIterator<B> {
        return this.aIndex.values();
    }

    columnA(): IterableIterator<A> {
        return this.aIndex.keys();
    }

    columnB(): IterableIterator<B> {
        return this.bIndex.keys();
    }

    delete(a: A): boolean {
        return this.deleteByA(a);
    }

    deleteByA(a: A):boolean {
        const b = this.aIndex.get(a);

        if (b !== undefined || this.aIndex.has(a)) {
            this.aIndex.delete(a);
            this.bIndex.delete(b as any);
            return true;
        } else {
            return false;
        }
    }
    
    deleteByB(b: B):boolean {
        const a = this.bIndex.get(b);

        if (a !== undefined || this.bIndex.has(b)){
            this.bIndex.delete(b);
            this.aIndex.delete(a as any);
            return true;
        } else {
            return false;
        }
    }

    clear() {
        this.aIndex.clear();
        this.bIndex.clear();
    }

    get size() {
        return this.aIndex.size;
    }

    forEach(callback: (b: B, a: A, map: this) => void) {
        this.aIndex.forEach((b, a) => callback(b, a, this));
    }

    has(a: A): boolean {
        return this.hasA(a);
    }

    hasA(a: A): boolean {
        return this.aIndex.has(a);
    }

    hasB(b: B): boolean {
        return this.bIndex.has(b);
    }

    entries(): IterableIterator<[A, B]> {
        return this.aIndex.entries();
    }

    [Symbol.iterator]() {
        return this.aIndex[Symbol.iterator]();
    }

    get [Symbol.toStringTag]() {
        return this.aIndex[Symbol.toStringTag];
    }
}
