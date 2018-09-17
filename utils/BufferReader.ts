import * as ints from 'buffer-more-ints';

export default class BufferReader {
    private _offset: number = 0;

    public constructor(private buf: Buffer) {}

    public readBool() {
        return (this.readUInt8() !== 0)
    }

    public readInt8() {
        const value = this.buf.readInt8(this._offset);
        this._offset += 1;

        return value;
    }

    public readUInt8() {
        const value = this.buf.readUInt8(this._offset);
        this._offset += 1;

        return value;
    }

    public readBufferSlice() {
        const len = this.readUInt32BE()
        return this.slice(len)
    }

    public slice(len: number = undefined) {
        const end = len ? this._offset + len : undefined
        const value = this.buf.slice(this._offset, end)
        this._offset += len;

        return value;
    }

    public readInt16BE() {
        const value = this.buf.readInt16BE(this._offset);
        this._offset += 2;

        return value;
    }

    public readUInt16BE() {
        const value = this.buf.readUInt16BE(this._offset);
        this._offset += 2;

        return value;
    }

    public readInt32BE() {
        const value = this.buf.readInt32BE(this._offset);
        this._offset += 4;

        return value;
    }

    public readUInt32BE() {
        const value = this.buf.readUInt32BE(this._offset);
        this._offset += 4;

        return value;
    }

    public readInt64BE() {
        const value = ints.readInt64BE(this.buf, this._offset);
        this._offset += 8;

        return value;
    }

    public readUInt64BE(): number {
        const value = ints.readUInt64BE(this.buf, this._offset);
        this._offset += 8;

        return value;
    }

    public readFloatBE() {
        const value = this.buf.readFloatBE(this._offset);
        this._offset += 4;

        return value;
    }

    public readDoubleBE() {
        const value = this.buf.readDoubleBE(this._offset);
        this._offset += 8;

        return value;
    }

    public readShortString() {
        const len = this.readUInt8();
        const value = this.buf.slice(this._offset, this._offset + len).toString('utf-8');
        this._offset += len;
        return value;
    }

    public readLongString() {
        const len = this.readUInt32BE();
        const value = this.buf.slice(this._offset, this._offset + len).toString('utf-8');
        this._offset += len;
        return value;
    }

    public readFieldTag() {
        return String.fromCharCode(this.buf[this._offset++]);
    }

    public readFieldArray() {
        const len = this.readUInt32BE()
        const arr = []
        const endOffset = this._offset + len;

        while (this._offset < endOffset) {
            arr.push(this.readTaggedFieldValue())
        }

        return arr
    }

    public readFieldTable(): Record<string, any> {
        const len = this.readUInt32BE();
        const table = {};
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
                return this.readShortString()
            case 'S':
                return this.readLongString()
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
                return this.readFieldTable()
            case 'A':
                return this.readFieldArray()
            case 'V':
                return null;
            case 'x':
                return this.readBufferSlice()
            default:
                throw new TypeError('Unexpected type tag "' + tag +'"');
        }
    }

    public readTableFromTemplate<T>(template: Record<string, any>): T {
        const obj = {}

        for (const key of Object.keys(template)) {
            if (typeof template[key] === 'string') {
                obj[key] = this.readFieldValue(template[key]);
            }
            else {
                obj[key] = this.readFieldTable()
            }
        }

        return <T>obj
    }
}