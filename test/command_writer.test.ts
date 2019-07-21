import { expect } from "chai";

import * as AMQP from '../src/protocol/index';
import CommandWriter from "../src/services/CommandWriter";
import Method from "../src/frames/Method";
import { EAMQPClasses, EFrameTypes } from "../src/interfaces/Protocol";
import { BASIC_CONSUME } from "../src/protocol/basic";

const CHANNEL = 1;

async function testSingleMethodFrame() {
    const writer = new CommandWriter();

    const method = new Method(EAMQPClasses.BASIC, BASIC_CONSUME, {
        reserved1: 0,
        queue: 'movies',
        consumer_tag: '',
        no_local: true,
        no_ack: false,
        exclusive: false,
        no_wait: false,
        arguments: {}
    });

    writer.end({
        method,
        channel: CHANNEL
    });

    const iter = writer[Symbol.asyncIterator]();
    const next = await iter.next();
    const buf: Buffer = next.value;

    const expected_payload = [
        0, EAMQPClasses.BASIC,
        0, BASIC_CONSUME,
        0, 0,
        6, ...Buffer.from('movies'),
        0,
        1,
        0, 0, 0, 0
    ]

    const expected_buffer = [
        EFrameTypes.FRAME_METHOD,
        0, CHANNEL,
        0, 0, 0, expected_payload.length,
        ...expected_payload,
        AMQP.FRAME_END
    ]

    expect([...buf]).to.be.eql(expected_buffer);
}

describe('CommandWriter', () => {
    it('can encode a single method frame', testSingleMethodFrame);
});