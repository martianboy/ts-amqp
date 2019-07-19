import { expect } from 'chai';

import BufferWriter from '../src/utils/BufferWriter';

function toByteArray(n: bigint): Uint8Array {
    const result = new Uint8Array(8).fill(0);

    for (let i = 7, x = n; x > 0; x = x >> 8n) {
        result[i--] = Number(x % 256n);
    }

    return result;
}

async function testWriteFieldTable() {
    const writer = new BufferWriter(Buffer.alloc(100));

    writer.writeFieldTable({
        'x-max-length': 10,
        'x-overflow': 'drop-head'
    });

    const buf = writer.slice();

    const expected = [
        0, 0, 0, 41,
        12, ...Buffer.from('x-max-length'),
        'u'.charCodeAt(0), 0, 10,
        10, ...Buffer.from('x-overflow'),
        'S'.charCodeAt(0), 0, 0, 0, 9, ...Buffer.from('drop-head')
    ];

    expect([...buf]).to.eql(expected);
}

async function testWriteNestedFieldTable() {
    const writer = new BufferWriter(Buffer.alloc(100));

    writer.writeFieldTable({
        'a': {
            'b': 1
        }
    });

    const buf = writer.slice();

    const expected = [
        0, 0, 0, 12,
        1, 'a'.charCodeAt(0),
        'F'.charCodeAt(0),
        0, 0, 0, 5,
        1, 'b'.charCodeAt(0),
        'u'.charCodeAt(0), 0, 1
    ];

    expect([...buf]).to.eql(expected);
}

function testWriteTimestamp() {
    const writer = new BufferWriter(Buffer.alloc(8));
    const d = new Date;

    writer.writeTimestamp(d);

    expect(Number(writer.buffer.readBigUInt64BE(0))).to.eql(Math.floor(d.getTime() / 1000));
}

async function testWriteTimestampInFieldTable() {
    const writer = new BufferWriter(Buffer.alloc(100));
    const d = new Date;

    writer.writeFieldTable({
        timestamp: d
    });

    const buf = writer.slice();

    const expected = [
        0, 0, 0, 19,
        9, ...Buffer.from('timestamp'),
        'T'.charCodeAt(0),
        ...toByteArray(BigInt(Math.floor(d.getTime() / 1000)))
    ];

    expect([...buf]).to.eql(expected);
}

describe('BufferWriter', () => {
    it('can encode ordinary field tables', testWriteFieldTable);
    it('can encode nested field tables', testWriteNestedFieldTable);
    it('can encode timestamps', testWriteTimestamp);
    it('can encode timestamp in field tables', testWriteTimestampInFieldTable);
});
