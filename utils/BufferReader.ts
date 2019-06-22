export default class BufferReader {
    private _offset: number = 0;
    private _bit_packing_mode = false;
    private _bit_position = 0;

    public constructor(private buf: Buffer) {}

    public get remaining(): boolean {
        return this._offset < this.buf.byteLength;
    }

    private resetBitPackingMode() {
        this._bit_packing_mode = false;
        this._bit_position = 0;
    }

    public readBool() {
        this.resetBitPackingMode();

        return this.readUInt8() !== 0;
    }

    public readPackedBool() {
        if (!this._bit_packing_mode) {
            this._bit_packing_mode = true;
        }

        return Boolean(
            this.buf[this._offset - 1] & (1 << this._bit_position++)
        );
    }

    public readInt8() {
        this.resetBitPackingMode();

        const value = this.buf.readInt8(this._offset);
        this._offset += 1;

        return value;
    }

    public readUInt8() {
        this.resetBitPackingMode();

        const value = this.buf.readUInt8(this._offset);
        this._offset += 1;

        return value;
    }

    public readBufferSlice() {
        const len = this.readUInt32BE();
        return this.slice(len);
    }

    public slice(len?: number) {
        this.resetBitPackingMode();

        let value;

        if (len) {
            const end = this._offset + len;
            value = this.buf.slice(this._offset, end);
            this._offset += len;
        } else {
            value = this.buf.slice(this._offset);
        }

        return value;
    }

    public readInt16BE() {
        this.resetBitPackingMode();

        const value = this.buf.readInt16BE(this._offset);
        this._offset += 2;

        return value;
    }

    public readUInt16BE() {
        this.resetBitPackingMode();

        const value = this.buf.readUInt16BE(this._offset);
        this._offset += 2;

        return value;
    }

    public readInt32BE() {
        this.resetBitPackingMode();

        const value = this.buf.readInt32BE(this._offset);
        this._offset += 4;

        return value;
    }

    public readUInt32BE() {
        this.resetBitPackingMode();

        const value = this.buf.readUInt32BE(this._offset);
        this._offset += 4;

        return value;
    }

    public readInt64BE() {
        this.resetBitPackingMode();

        const value = this.buf.readBigInt64BE(this._offset);
        this._offset += 8;

        return value;
    }

    public readUInt64BE() {
        this.resetBitPackingMode();

        const value = this.buf.readBigUInt64BE(this._offset);
        this._offset += 8;

        return value;
    }

    public readFloatBE() {
        this.resetBitPackingMode();

        const value = this.buf.readFloatBE(this._offset);
        this._offset += 4;

        return value;
    }

    public readDoubleBE() {
        this.resetBitPackingMode();

        const value = this.buf.readDoubleBE(this._offset);
        this._offset += 8;

        return value;
    }

    public readShortString() {
        this.resetBitPackingMode();

        const len = this.readUInt8();
        const value = this.buf
            .slice(this._offset, this._offset + len)
            .toString('utf-8');
        this._offset += len;
        return value;
    }

    public readLongString() {
        this.resetBitPackingMode();

        const len = this.readUInt32BE();
        const value = this.buf
            .slice(this._offset, this._offset + len)
            .toString('utf-8');
        this._offset += len;
        return value;
    }

    public readFieldTag() {
        return String.fromCharCode(this.buf[this._offset++]);
    }

    public readFieldArray() {
        this.resetBitPackingMode();

        const len = this.readUInt32BE();
        const arr = [];
        const endOffset = this._offset + len;

        while (this._offset < endOffset) {
            arr.push(this.readTaggedFieldValue());
        }

        return arr;
    }

    public readFieldTable(): Record<string, any> {
        const len = this.readUInt32BE();
        const table: Record<string, any> = {};
        const endOffset = this._offset + len;

        while (this._offset < endOffset) {
            const key = this.readShortString();
            const value = this.readTaggedFieldValue();

            table[key] = value;
        }

        return table;
    }

    public readTaggedFieldValue(): any {
        const tag = this.readFieldTag();
        return this.readFieldValue(tag);
    }

    protected readFieldValue(tag: string): any {
        switch (tag[0]) {
            case 't':
                return this.readBool();
            case 'P':
                return this.readPackedBool();
            case 'b':
                return this.readInt8();
            case 'B':
                return this.readUInt8();
            case 'u':
                return this.readUInt16BE();
            case 'U':
                return this.readInt16BE();
            case 'i':
                return this.readUInt32BE();
            case 'I':
                return this.readInt32BE();
            case 'l':
                return this.readUInt64BE();
            case 'L':
                return this.readInt64BE();
            case 'f':
                return this.readFloatBE();
            case 'd':
                return this.readDoubleBE();
            case 's':
                return this.readShortString();
            case 'S':
                return this.readLongString();
            // case 'D': // only positive decimals, apparently.
            //     var places = buf[offset]; offset++;
            //     var digits = buf.readUInt32BE(offset); offset += 4;
            //     val = {'!': 'decimal', value: {places: places, digits: digits}};
            //     break;
            // case 'T':
            //     val = ints.readUInt64BE(buf, offset); offset += 8;
            //     val = {'!': 'timestamp', value: val};
            //     break;
            case 'F':
                return this.readFieldTable();
            case 'A':
                return this.readFieldArray();
            case 'V':
                return null;
            case 'x':
                return this.readBufferSlice();
            default:
                throw new TypeError('Unexpected type tag "' + tag + '"');
        }
    }

    public readTableFromTemplate<T>(template: Record<string, any>): T {
        const obj: Record<string, any> = {};

        for (const key of Object.keys(template)) {
            if (typeof template[key] === 'string') {
                obj[key] = this.readFieldValue(template[key]);
            } else {
                obj[key] = this.readFieldTable();
            }
        }

        return <T>obj;
    }
}
