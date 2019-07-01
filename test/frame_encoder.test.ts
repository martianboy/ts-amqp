import { expect } from 'chai';

import FrameEncoder from '../src/services/FrameEncoder';
import Method from '../src/frames/Method';
import { EAMQPClasses, EFrameTypes } from '../src/interfaces/Protocol';
import { BASIC_PUBLISH } from '../src/protocol/basic';
import { FRAME_END } from '../src/protocol';
import ContentHeader from '../src/frames/ContentHeader';
import Frame from '../src/frames/Frame';

const CHANNEL = 1;

async function testEncodeMethodFrame() {
    const encoder = new FrameEncoder(256);
    const method = new Method(EAMQPClasses.BASIC, BASIC_PUBLISH, {
        reserved1: 0,
        exchange_name: '',
        routing_key: 'queue',
        mandatory: false,
        immediate: false
    }).toIFrame(CHANNEL);

    const expected = [
        EFrameTypes.FRAME_METHOD,
        0, CHANNEL,
        0, 0, 0, 14,
        0, EAMQPClasses.BASIC,
        0, BASIC_PUBLISH,
        0, 0,
        0,
        5, ...Buffer.from('queue', 'utf-8'),
        0,
        FRAME_END
    ];

    encoder.write(method);

    const iter = encoder[Symbol.asyncIterator]();
    const chunk = await iter.next();

    expect([...chunk.value]).to.eql(expected);
}

async function testEncodeHeaderFrame() {
    const encoder = new FrameEncoder(256);

    const header = new ContentHeader(
        EAMQPClasses.BASIC,
        10n,
        {
            contentType: 'application/json'
        }
    ).toIFrame(CHANNEL);

    encoder.write(header);

    const iter = encoder[Symbol.asyncIterator]();
    const chunk = await iter.next();

    const expected = [
        EFrameTypes.FRAME_HEADER,
        0, CHANNEL,
        0, 0, 0, 31,
        0, EAMQPClasses.BASIC,
        0, 0,
        0, 0, 0, 0, 0, 0, 0, 10,
        1 << 7, 0,
        16, ...Buffer.from('application/json'),
        FRAME_END
    ];
    expect([...chunk.value]).to.eql(expected);
}

async function testEncodeBodyFrame() {
    const encoder = new FrameEncoder(128);

    const payload = [10, 20, 30];

    const body = new Frame(
        EFrameTypes.FRAME_BODY,
        CHANNEL,
        Buffer.from(payload)
    );

    encoder.write(body);

    const iter = encoder[Symbol.asyncIterator]();
    const chunk = await iter.next();

    const expected = [
        EFrameTypes.FRAME_BODY,
        0, CHANNEL,
        0, 0, 0, payload.length,
        ...payload,
        FRAME_END
    ];
    expect([...chunk.value]).to.eql(expected);
}

describe('FrameEncoder', () => {
    it('can encode method frame', testEncodeMethodFrame);
    it('can encode header frame', testEncodeHeaderFrame);
    it('can encode body frame', testEncodeBodyFrame);
});
