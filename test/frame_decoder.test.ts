import { expect } from 'chai';

import FrameDecoder from '../src/services/FrameDecoder';
import Method from '../src/frames/Method';
import { EAMQPClasses, EFrameTypes, IFrame } from '../src/interfaces/Protocol';
import { BASIC_PUBLISH, BASIC_DELIVER } from '../src/protocol/basic';
import { FRAME_END } from '../src/protocol';
import ContentHeader from '../src/frames/ContentHeader';

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
        0, 0, 0, 25,
        0, EAMQPClasses.BASIC,
        0, 0,
        0, 0, 0, 0, 0, 0, 0, 10,
        1 << 7, 0,
        10, ...Buffer.from('text/plain', 'utf-8'),
        FRAME_END
    ];

    const header = new ContentHeader(
        EAMQPClasses.BASIC,
        10n,
        {
            contentType: 'text/plain'
        }
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

async function testDecodeMultipleFrames() {
    const buffer = Buffer.from([1, 0, 1, 0, 0, 0, 52, 0, 60, 0, 60, 31, 97, 109, 113, 46, 99, 116, 97, 103, 45, 120, 71, 104, 100, 48, 117, 55, 115, 108, 112, 120, 72, 85, 118, 103, 85, 52, 76, 108, 89, 71, 119, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 5, 103, 104, 111, 108, 105, 206, 2, 0, 1, 0, 0, 0, 36, 0, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 240, 0, 10, 116, 101, 120, 116, 47, 112, 108, 97, 105, 110, 5, 117, 116, 102, 45, 56, 0, 0, 0, 0, 1, 206, 3, 0, 1, 0, 0, 0, 6, 72, 101, 108, 108, 111, 33, 206]);
    const decoder = new FrameDecoder();

    decoder.write(buffer);
    const iter = decoder[Symbol.asyncIterator]();

    const { value: method } = await iter.next();
    const { value: header } = await iter.next();
    const { value: body } = await iter.next();

    expect(method.method).to.be.eql({
        class_id: EAMQPClasses.BASIC,
        method_id: BASIC_DELIVER,
        args: {
            consumer_tag: "amq.ctag-xGhd0u7slpxHUvgU4LlYGw",
            delivery_tag: 1n,
            redelivered: false,
            routing_key: "gholi",
            exchange_name: ""
        }
    });

    expect(header.header).to.be.eql({
        body_size: 6n,
        class_id: 60,
        properties: {
            contentEncoding: "utf-8",
            contentType: "text/plain",
            deliveryMode: 1,
            headers: {}
        }
    });

    expect(body.payload.toString('utf-8')).to.be.equal('Hello!');
}

describe('FrameDecoder', () => {
    it('can decode method frame', testDecodeMethodFrame);
    it('can decode header frame', testDecodeHeaderFrame);
    it('can decode body frame', testDecodeBodyFrame);
    it('can decode multiple frames', testDecodeMultipleFrames);
});
