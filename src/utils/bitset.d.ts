export default class BitSet {
    public constructor();
    public set(pos: number): number;
    public clear(pos: number): number;
    public get(pos: number): number;
    public words(): number;
    public cardinality(): number;
    public or(set: BitSet): this;
    public and(set: BitSet): this;
    public xor(set: BitSet): this;
    public nextSetBit(pos: number): number;
    public prevSetBit(pos: number): number;
}
