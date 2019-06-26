import { expect } from 'chai';

import FrameDecoder from '../services/FrameDecoder';
import Method from '../frames/Method';
import { EAMQPClasses, EFrameTypes, IFrame } from '../interfaces/Protocol';
import { BASIC_PUBLISH } from '../protocol/basic';
import { FRAME_END } from '../protocol';
import ContentHeader from '../frames/ContentHeader';

const CHANNEL = 1;

async function testDecodeMethodFrame() {
    const decoder = new FrameDecoder();
    const method_frame = new Method(EAMQPClasses.BASIC, BASIC_PUBLISH, {
        exchange_name: '',
        routing_key: 'queue',
        mandatory: false,
        immediate: false
    }).toIFrame(CHANNEL);

    const buffer = [
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

    decoder.write(Buffer.from(buffer));

    const iter = decoder[Symbol.asyncIterator]();
    const { value: frame } = await iter.next();

    expect(frame).to.eql({
        ...frame,
        method: {
            ...method_frame.method,
            args: {
                reserved1: 0,
                ...method_frame.method.args,
            }
        }
    });
}

async function testDecodeHeaderFrame() {
    const decoder = new FrameDecoder();

    const buffer = [
        EFrameTypes.FRAME_HEADER,
        0, CHANNEL,
        0, 0, 0, 14,
        0, EAMQPClasses.BASIC,
        0, 0,
        0, 0, 0, 0, 0, 0, 0, 10,
        0, 0,
        FRAME_END
    ];

    const header = new ContentHeader(
        EAMQPClasses.BASIC,
        10n,
        {}
    ).toIFrame(CHANNEL);

    decoder.write(Buffer.from(buffer));

    const iter = decoder[Symbol.asyncIterator]();
    const frame = await iter.next();

    expect(frame.value).to.eql(header);
}

async function testDecodeBodyFrame() {
    const decoder = new FrameDecoder();

    const payload = [10, 20, 30];

    const buffer = [
        EFrameTypes.FRAME_BODY,
        0, CHANNEL,
        0, 0, 0, payload.length,
        ...payload,
        FRAME_END
    ];

    const body: IFrame = {
        type: EFrameTypes.FRAME_BODY,
        channel: CHANNEL,
        payload: Buffer.from(payload)
    };

    decoder.write(Buffer.from(buffer));

    const iter = decoder[Symbol.asyncIterator]();
    const frame = await iter.next();
    expect(frame.value).to.eql(body);
}

describe('FrameDecoder', () => {
    it('can decode method frame', testDecodeMethodFrame);
    it('can decode header frame', testDecodeHeaderFrame);
    it('can decode body frame', testDecodeBodyFrame);
});
