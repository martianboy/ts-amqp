import _ from 'lodash';
import * as AMQP from '../amqp';

export default class BufferWriter {
    protected _offset: number = 0;
    protected buf: Buffer = Buffer.alloc(0);

    protected getDatumSize(tag: string, value: any) {
        switch (tag[0]) {
            case 't':
            case 'b':
            case 'B':
                return 1;
            case 'u':
            case 'U':
                return 2;
            case 'i':
            case 'I':
            case 'f':
                return 4;
            case 'l':
            case 'L':
            case 'd':
            case 'T':
                return 8;
            case 's':
                if (value.length > 255) {
                    throw new Error('Short strings should not exceed a maximum length of 255 octets.')
                }

                return value.length + 1
            case 'S':
                return value.length + 4
            case 'x':
                return value.length
            case 'A':
                return this.getArrayFieldSize(tag[1], value) + 4
            default:
                throw new TypeError('Unexpected type tag "' + tag +'"');
        }
    }

    protected getFieldTableSize(tpl: Record<string, any>, value: Record<string, any>): number {
        const keys = _.intersection(Object.keys(value), Object.keys(tpl));

        return keys.reduce<number>((size: number, k: string) => {
            if (!tpl[k]) return size;

            if (typeof tpl[k] === 'string') {
                return size + AMQP.FT_KEY_SIZE + k.length + AMQP.FT_TAG_SIZE + this.getDatumSize(tpl[k], value[k]);
            }

            return 1  + 4 + this.getFieldTableSize(tpl[k], value[k]);
        }, 0);
    }

    protected getArrayFieldSize(tag: string, value: Array<any>): number {
        return value.reduce((size, x) => {
            return size + 1 + this.getDatumSize(tag, x)
        }, 0);
    }

    protected getStructSize(obj: Record<string, any>): number {
        const keys = _.intersection(Object.keys(obj), Object.keys(this.bufferTpl));

        return keys.reduce((size, k) => {
            if (!this.bufferTpl[k]) return size;

            if (typeof this.bufferTpl[k] === 'string') {
                return size + this.getDatumSize(this.bufferTpl[k], obj[k]);
            }

            return 4 + this.getFieldTableSize(this.bufferTpl[k], obj[k]);
        }, 0);
    }

    public constructor(protected bufferTpl: Record<string, any>) {}

    public copyFrom(buf: Buffer) {
        buf.copy(this.buf, this._offset);
        this._offset += buf.length;
    }

    public writeUInt8(value: number) {
        return this.buf.writeUInt8(value, this._offset++);
    }

    public writeInt8(value: number) {
        return this.buf.writeInt8(value, this._offset++);
    }

    public writeUInt16BE(value: number) {
        this.buf.writeUInt16BE(value, this._offset);
        this._offset += 2;
    }

    public writeInt16BE(value: number) {
        this.buf.writeInt16BE(value, this._offset);
        this._offset += 2;
    }

    public writeFloatBE(value: number) {
        this.buf.writeFloatBE(value, this._offset);
        this._offset += 4;
    }

    public writeUInt32BE(value: number) {
        this.buf.writeUInt32BE(value, this._offset);
        this._offset += 4;
    }

    public writeInt32BE(value: number) {
        this.buf.writeInt32BE(value, this._offset);
        this._offset += 4;
    }

    public writeDoubleBE(value: number) {
        this.buf.writeDoubleBE(value, this._offset);
        this._offset += 8;
    }

    public writeShortString(str: string) {
        this.writeUInt8(str.length);
        this.buf.write(str, this._offset);
        this._offset += str.length;
    }

    public writeLongString(str: string) {
        this.writeUInt32BE(str.length);
        this.buf.write(str, this._offset);
        this._offset += str.length;
    }

    public writeTag(tag: string) {
        this.buf.write(tag, this._offset);
        this._offset += 1;
    }

    public writeFieldValue(tag: string, value: any, with_tag: boolean) {
        if (with_tag) {
            this.writeTag(tag[0])
        }

        switch (tag[0]) {
            case 't':
                return this.writeUInt8(value ? 1 : 0)
            case 'b':
                return this.writeInt8(value)
            case 'B':
                return this.writeUInt8(value)
            case 'u':
                return this.writeUInt16BE(value)
            case 'U':
                return this.writeInt16BE(value)
            case 'i':
                return this.writeUInt32BE(value)
            case 'I':
                return this.writeInt32BE(value)
            case 'f':
                return this.writeFloatBE(value)
            case 'd':
                return this.writeDoubleBE(value)
            case 's':
                if (value.length > 255) {
                    throw new Error('Short strings should not exceed a maximum length of 255 octets.')
                }

                return this.writeShortString(value)
            case 'S':
                return this.writeLongString(value)
            case 'x':
                if (Buffer.isBuffer(value) && value.length > 0) {
                    return this.copyFrom(value)
                }
                break;
            case 'A':
                return this.writeFieldArray(tag[1], value)
            default:
                throw new TypeError('Unexpected type tag "' + tag +'"');
        }
    }

    public writeFieldArray(tag: string, arr: Array<any>) {
        this.writeUInt32BE(this.getArrayFieldSize(tag, arr))
        for (const x of arr) {
            this.writeFieldValue(tag, x, true);
        }
    }

    public writeFieldTable(tpl: Record<string, any>, obj: Record<string, any>) {
        const keys = _.intersection(Object.keys(obj), Object.keys(tpl));

        const len = this.getFieldTableSize(tpl, obj)
        this.writeUInt32BE(len);

        for (const k of keys) {
            this.writeShortString(k);

            if (typeof tpl[k] === 'string') {
                this.writeFieldValue(tpl[k], obj[k], true);
            }
            else {
                this.writeFieldTable(tpl[k], obj[k])
            }
        }
    }

    public writeToBuffer(obj: Record<string, any>): Buffer {
        const size = this.getStructSize(obj);
        this.buf = Buffer.alloc(size);

        const keys = _.intersection(Object.keys(this.bufferTpl), Object.keys(obj));

        for (const k of keys) {
            if (typeof this.bufferTpl[k] === 'string') {
                this.writeFieldValue(this.bufferTpl[k], obj[k], false);
            }
            else {
                this.writeFieldTable(this.bufferTpl[k], obj[k])
            }
        }

        return this.buf;
    }
}