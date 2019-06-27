import { expect } from "chai";

import CommandReader, { EReaderState } from "../services/CommandReader";
import Method from "../frames/Method";
import { EAMQPClasses, ICommand, IBodyFrame, EFrameTypes } from "../interfaces/Protocol";
import { BASIC_PUBLISH, BASIC_CONSUME } from "../protocol/basic";
import ContentHeader from "../frames/ContentHeader";

const CHANNEL = 1;

async function testSingleMethodFrame() {
    const reader = new CommandReader();

    const method_frame = new Method(EAMQPClasses.BASIC, BASIC_CONSUME, {
        reserved1: 0,
        queue: 'queue',
        consumer_tag: '',
        no_local: true,
        no_ack: false,
        exclusive: false,
        no_wait: false,
        arguments: {}
    }).toIFrame(CHANNEL);

    reader.write(method_frame);

    const iter = reader[Symbol.asyncIterator]();
    const next = await iter.next();
    const command: ICommand = next.value;

    expect(command.channel).to.be.equal(CHANNEL);
    expect(command.method).to.be.eql(method_frame.method);
    expect(reader.state).to.be.equal(EReaderState.EXPECTING_METHOD);
}

async function testMethodWithBody() {
    const reader = new CommandReader();

    const method_frame = new Method(EAMQPClasses.BASIC, BASIC_PUBLISH, {
        reserved1: 0,
        exchange_name: '',
        routing_key: 'queue',
        mandatory: false,
        immediate: false
    }).toIFrame(CHANNEL);
    reader.write(method_frame);

    expect(reader.state).to.be.equal(EReaderState.EXPECTING_HEADER);

    const header_frame = new ContentHeader(EAMQPClasses.BASIC, 13n, {
        contentType: 'plain/text'
    }).toIFrame(CHANNEL);
    await reader.write(header_frame);

    expect(reader.state).to.be.equal(EReaderState.EXPECTING_BODY);

    const body_frame: IBodyFrame = {
        channel: CHANNEL,
        payload: Buffer.from('Hello, World!'),
        type: EFrameTypes.FRAME_BODY
    };
    await reader.write(body_frame);

    const iter = reader[Symbol.asyncIterator]();
    const next = await iter.next();
    const command: ICommand = next.value;

    expect(command.channel).to.be.equal(CHANNEL);
    expect(command.method).to.be.eql(method_frame.method);
    expect(command.header).to.be.eql(header_frame.header);
    expect(command.body!.toString('utf-8')).to.be.equal('Hello, World!');

    expect(reader.state).to.be.equal(EReaderState.EXPECTING_METHOD);
}

describe('CommandReader', () => {
    it('can read a single method frame', testSingleMethodFrame);
    it('can read a method frame with body', testMethodWithBody);
})