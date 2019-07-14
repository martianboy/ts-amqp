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
        0, 0, 0, 38,
        12, ...Buffer.from('x-max-length'),
        'u'.charCodeAt(0), 0, 10,
        10, ...Buffer.from('x-overflow'),
        's'.charCodeAt(0), 9, ...Buffer.from('drop-head')
    ];

    expect([...buf]).to.eql(expected);
}

describe('BufferWriter', () => {
    it('can encode field tables', testWriteFieldTable);
});
