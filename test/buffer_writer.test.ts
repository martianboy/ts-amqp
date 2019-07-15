import { expect } from 'chai';

import BufferWriter from '../src/utils/BufferWriter';

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

describe('BufferWriter', () => {
    it('can encode ordinary field tables', testWriteFieldTable);
    it('can encode nested field tables', testWriteNestedFieldTable);
});
