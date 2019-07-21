import { expect } from 'chai';
import * as chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);

import ChannelN from '../../src/classes/ChannelN';
import MockConnection from './connection';
import { EAMQPClasses, ICommand } from '../../src/interfaces/Protocol';
import {
    CHANNEL_OPEN,
    CHANNEL_OPEN_OK,
    CHANNEL_CLOSE_OK,
    CHANNEL_CLOSE
} from '../../src/protocol/channel';

function rpcRespond<T>(
    fn: (...args: unknown[]) => Promise<T>,
    args: unknown[],
    ch: ChannelN,
    resp: ICommand
) {
    return new Promise((resolve: (result: T) => void, reject: (ex: any) => void) => {
        fn.apply(ch, args).then((result: T) => resolve(result), reject);

        ch.handleCommand(resp);
    });
}

function openChannel(conn: MockConnection) {
    const ch: ChannelN = new ChannelN(conn, 1);
    return rpcRespond(ch.open, [], ch, {
        channel: 1,
        method: {
            class_id: EAMQPClasses.CHANNEL,
            method_id: CHANNEL_OPEN_OK,
            args: {
                reserved1: ''
            }
        }
    });
}

async function testOpenChannel() {
    const conn = new MockConnection();
    sinon.stub(conn, 'sendCommand');
    const ch = await openChannel(conn);

    const expected_command: ICommand = {
        channel: 1,
        method: {
            class_id: EAMQPClasses.CHANNEL,
            method_id: CHANNEL_OPEN,
            args: {
                reserved1: ''
            }
        }
    };

    expect(conn.sendCommand).to.have.been.calledWith(expected_command);
    expect(ch.channelState).to.be.equal('open');
}

async function testCloseChannel() {
    const conn = new MockConnection();
    const ch = await openChannel(conn);
    sinon.stub(conn, 'sendCommand');

    await rpcRespond(ch.close, [], ch, {
        channel: 1,
        method: {
            class_id: EAMQPClasses.CHANNEL,
            method_id: CHANNEL_CLOSE_OK,
            args: {}
        }
    });

    const expected_command: ICommand = {
        channel: 1,
        method: {
            class_id: EAMQPClasses.CHANNEL,
            method_id: CHANNEL_CLOSE,
            args: {
                reply_code: 200,
                reply_text: "Let's connect soon!",
                class_id: 0,
                method_id: 0
            }
        }
    };

    expect(conn.sendCommand).to.have.been.calledWith(expected_command);
    // @ts-ignore
    expect(ch.destroyed).to.be.true;
    // @ts-ignore
    expect(ch.json.destroyed).to.be.true;
    expect(ch.channelState).to.be.equal('closed');
}

describe('Channel', () => {
    it('can open a channel', testOpenChannel);
    it('can close a channel', testCloseChannel);
});
