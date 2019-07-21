import { expect } from "chai";

import Method from "../src/frames/Method";
import { EAMQPClasses, EFrameTypes, IMethodFrame, IHeader, IBasicProperties, IHeaderFrame } from "../src/interfaces/Protocol";
import { IQueue } from "../src/interfaces/Queue";
import { QUEUE_DECLARE } from "../src/protocol/queue";
import Frame from "../src/frames/Frame";
import ContentHeader from "../src/frames/ContentHeader";
import { dateToByteArray } from "./utils";

const CHANNEL = 1;

function testMethodToIFrame() {
    const args = {
        name: 'movies',
        durable: true,
        exclusive: false,
        auto_delete: false,
        arguments: {}
    };
    const method = new Method(EAMQPClasses.QUEUE, QUEUE_DECLARE, args);
    const expected: IMethodFrame = {
        channel: CHANNEL,
        method: {
            class_id: EAMQPClasses.QUEUE,
            method_id: QUEUE_DECLARE,
            args
        },
        type: EFrameTypes.FRAME_METHOD
    };

    expect(method.toIFrame(CHANNEL)).to.be.eql(expected);
}

function testMethodToFrame() {
    const args = {
        reserved1: 0,
        queue: 'movies',
        passive: false,
        durable: true,
        exclusive: false,
        auto_delete: false,
        no_wait: false,
        arguments: {
            'x-max-length': 10
        }
    };
    const frame = new Method(EAMQPClasses.QUEUE, QUEUE_DECLARE, args).toFrame(CHANNEL);
    const expected_buffer: number[] = [
        0, EAMQPClasses.QUEUE,
        0, QUEUE_DECLARE,
        0, 0,
        6, ...Buffer.from('movies'),
        2,
        0, 0, 0, 16,
        12, ...Buffer.from('x-max-length'),
        'u'.charCodeAt(0),
        0, 10
    ];

    expect(frame.channel).to.be.eql(CHANNEL);
    expect(frame.type).to.be.eql(EFrameTypes.FRAME_METHOD);
    expect([...frame.payload!]).to.be.eql(expected_buffer);
}

function testMethodFromFrame() {
    const frame = new Frame(EFrameTypes.FRAME_METHOD, CHANNEL, Buffer.from([
        0, EAMQPClasses.QUEUE,
        0, QUEUE_DECLARE,
        0, 0,
        6, ...Buffer.from('movies'),
        2,
        0, 0, 0, 16,
        12, ...Buffer.from('x-max-length'),
        'u'.charCodeAt(0),
        0, 10
    ]));

    const method = Method.fromFrame<IQueue>(frame);
    const expected_args = {
        reserved1: 0,
        queue: 'movies',
        passive: false,
        durable: true,
        exclusive: false,
        auto_delete: false,
        no_wait: false,
        arguments: {
            'x-max-length': 10
        }
    };

    expect(method.class_id).to.be.equal(EAMQPClasses.QUEUE);
    expect(method.method_id).to.be.equal(QUEUE_DECLARE);
    expect(method.args).to.be.eql(expected_args);
}

function testHeaderToIFrame() {
    const properties: IBasicProperties = {
        contentType: 'application/json',
        contentEncoding: 'utf-8',
        headers: {
            'x-msg': 'Hello!'
        },
        deliveryMode: 2,
        priority: 10,
        correlationId: '123456789',
        replyTo: 'movies.reply',
        expiration: '10',
        messageId: "msg-id-123",
        timestamp: new Date,
        userId: '1',
        appId: '1',
        clusterId: '101',
        type: 'type'
    };
    const iframe = new ContentHeader(EAMQPClasses.BASIC, 10n, properties).toIFrame(CHANNEL);

    const expected: IHeaderFrame = {
        channel: CHANNEL,
        header: {
            body_size: 10n,
            class_id: EAMQPClasses.BASIC,
            properties
        },
        type: EFrameTypes.FRAME_HEADER
    };

    expect(iframe).to.be.eql(expected)
}

function testHeaderToFrame() {
    const properties: IBasicProperties = {
        contentType: 'application/json',
        contentEncoding: 'utf-8',
        headers: {
            'x-msg': 'Hello!'
        },
        deliveryMode: 2,
        priority: 10,
        correlationId: '123456789',
        replyTo: 'movies.reply',
        expiration: '10',
        messageId: 'msg-id-123',
        timestamp: new Date,
        userId: '1',
        appId: '1',
        clusterId: '101',
        type: 'type'
    };
    const frame = new ContentHeader(EAMQPClasses.BASIC, 10n, properties).toFrame(CHANNEL);

    const expected_buffer: number[] = [
        0, EAMQPClasses.BASIC,
        0, 0,
        0, 0, 0, 0, 0, 0, 0, 10,
        255, 255 - 4 - 2 - 1,
        16, ...Buffer.from('application/json'),
        5, ...Buffer.from('utf-8'),
        0, 0, 0, 17,
        5, ...Buffer.from('x-msg'),
        'S'.charCodeAt(0),
        0, 0, 0, 6, ...Buffer.from('Hello!'),
        2,
        10,
        9, ...Buffer.from('123456789'),
        12, ...Buffer.from('movies.reply'),
        2, ...Buffer.from('10'),
        10, ...Buffer.from('msg-id-123'),
        ...dateToByteArray(properties.timestamp!),
        1, '1'.charCodeAt(0),
        1, '1'.charCodeAt(0),
        3, ...Buffer.from('101')
    ];

    expect(frame.channel).to.be.eql(CHANNEL);
    expect(frame.type).to.be.eql(EFrameTypes.FRAME_HEADER);
    expect([...frame.payload!]).to.be.eql(expected_buffer);
}

function testHeaderFromFrame() {
    const d = new Date;
    d.setMilliseconds(0);

    const frame = new Frame(EFrameTypes.FRAME_HEADER, CHANNEL, Buffer.from([
        0, EAMQPClasses.BASIC,
        0, 0,
        0, 0, 0, 0, 0, 0, 0, 10,
        255, 255 - 4 - 2 - 1,
        16, ...Buffer.from('application/json'),
        5, ...Buffer.from('utf-8'),
        0, 0, 0, 17,
        5, ...Buffer.from('x-msg'),
        'S'.charCodeAt(0),
        0, 0, 0, 6, ...Buffer.from('Hello!'),
        2,
        10,
        9, ...Buffer.from('123456789'),
        12, ...Buffer.from('movies.reply'),
        2, ...Buffer.from('10'),
        10, ...Buffer.from('msg-id-123'),
        ...dateToByteArray(d),
        1, '1'.charCodeAt(0),
        1, '1'.charCodeAt(0),
        3, ...Buffer.from('101')
    ]));

    const header = ContentHeader.fromFrame(frame);
    const expected_properties: IBasicProperties = {
        contentType: 'application/json',
        contentEncoding: 'utf-8',
        headers: {
            'x-msg': 'Hello!'
        },
        deliveryMode: 2,
        priority: 10,
        correlationId: '123456789',
        replyTo: 'movies.reply',
        expiration: '10',
        messageId: 'msg-id-123',
        timestamp: d,
        userId: '1',
        appId: '1',
        clusterId: '101'
    };

    expect(header.body_size).to.be.equal(10n);
    expect(header.class_id).to.be.equal(EAMQPClasses.BASIC);
    expect(header.properties).to.be.eql(expected_properties);
}

function testHeaderFromInvalidFrame() {
    const invalid_frame = new Frame(EFrameTypes.FRAME_BODY, CHANNEL, Buffer.from([]));

    expect(() => ContentHeader.fromFrame(invalid_frame)).to.throw('Invalid frame!');
}

describe('Frames', () => {
    describe('Method', () => {
        it('toIFrame', testMethodToIFrame);
        it('toFrame', testMethodToFrame);
        it('fromFrame<T>', testMethodFromFrame);
    });

    describe('ContentHeader', () => {
        it('toIFrame', testHeaderToIFrame);
        it('toFrame', testHeaderToFrame);
        it('fromFrame', testHeaderFromFrame);
        it('fromFrame(invalid frame type)', testHeaderFromInvalidFrame);
    })
});