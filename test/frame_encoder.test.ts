import { expect } from 'chai';

import FrameEncoder from '../services/FrameEncoder';
import Method from '../frames/Method';
import { EAMQPClasses, EFrameTypes } from '../interfaces/Protocol';
import { BASIC_PUBLISH } from '../protocol/basic';
import { FRAME_END } from '../protocol';
import ContentHeader from '../frames/ContentHeader';
import Frame from '../frames/Frame';

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
        {}
    ).toIFrame(CHANNEL);

    encoder.write(header);

    const iter = encoder[Symbol.asyncIterator]();
    const chunk = await iter.next();

    const expected = [
        EFrameTypes.FRAME_HEADER,
        0, CHANNEL,
        0, 0, 0, 14,
        0, EAMQPClasses.BASIC,
        0, 0,
        0, 0, 0, 0, 0, 0, 0, 10,
        0, 0,
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
