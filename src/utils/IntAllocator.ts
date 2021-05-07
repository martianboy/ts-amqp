import BitSet from './bitset';

export default class IntAllocator {
    private loRange: number; // the integer bit 0 represents
    private hiRange: number; // one more than the integer the highest bit represents
    private numberOfBits: number; // relevant in freeSet
    private lastIndex = 0; // for searching for FREE integers
    private freeSet: BitSet;

    /**
     * Creates an IntAllocator allocating integer IDs within the
     * inclusive range [<code>bottom</code>, <code>top</code>].
     * @param bottom lower end of range
     * @param top upper end of range (inclusive)
     */
    public constructor(bottom: number, top: number) {
        this.loRange = bottom;
        this.hiRange = top + 1;
        this.numberOfBits = this.hiRange - this.loRange;
        this.freeSet = new BitSet();

        // All integers FREE initially
        for (let i = 0; i < this.numberOfBits; i++) {
            this.freeSet.set(i);
        }
    }

    /**
     * Allocate an unallocated integer from the range, or return -1 if no
     * more integers are available.
     * @return the allocated integer, or -1
     */
    public allocate(): number {
        let setIndex = this.freeSet.nextSetBit(this.lastIndex);
        if (setIndex < 0) {
            // means none found in trailing part
            setIndex = this.freeSet.nextSetBit(0);
        }

        if (setIndex < 0) return -1;

        this.lastIndex = setIndex;
        this.freeSet.clear(setIndex);

        return setIndex + this.loRange;
    }

    /**
     * Make the provided integer available for allocation again.
     * @param reservation the previously allocated integer to free
     */
    public free(reservation: number): void {
        this.freeSet.set(reservation - this.loRange);
    }

    /**
     * Attempt to reserve the provided ID as if it had been allocated. Returns
     * true if it is available, false otherwise.
     * @param reservation the integer to be allocated, if possible
     * @return true if allocated, false if already allocated
     */
    public reserve(reservation: number): boolean {
        const index = reservation - this.loRange;

        return !this.freeSet.get(index);
    }
}
