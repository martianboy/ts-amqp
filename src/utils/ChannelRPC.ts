import debugFn from 'debug';
const debug = debugFn('ts-amqp');

import { ICloseReason, EAMQPClasses, ICommand } from '../interfaces/Protocol';
import Channel from '../classes/Channel';
import { CHANNEL_CLOSE } from '../protocol/channel';
import CloseReason from './CloseReason';

export default class ChannelRPC {
    protected ch: Channel;
    protected class_id: EAMQPClasses;

    public constructor(ch: Channel, class_id: EAMQPClasses) {
        this.ch = ch;
        this.class_id = class_id;
    }

    public async waitFor(
        class_id: EAMQPClasses,
        method_id: number
    ): Promise<ICommand> {
        for await (const command of this.ch) {
            const m = command.method;

            debug('##### Received', m.class_id, ':', m.method_id);

            if (m.class_id === class_id && m.method_id === method_id) {
                return command;
            } else if (
                m.class_id === EAMQPClasses.CHANNEL &&
                m.method_id === CHANNEL_CLOSE
            ) {
                const reason = m.args as ICloseReason;
                debug('Oh noes!', reason);

                if (
                    reason.class_id === m.class_id &&
                    reason.method_id === m.method_id &&
                    reason.reply_code >= 400 // Is it possible that server closes with a < 400 code?
                ) {
                    throw new CloseReason(reason);
                }
            }
        }

        throw new Error(`No response for ${class_id}:${method_id}`);
    }

    public async call<T>(
        method: number,
        resp_method: number,
        args: unknown
    ): Promise<T> {
        this.ch.write({
            class_id: this.class_id,
            method_id: method,
            args
        });

        const resp = await this.waitFor(this.class_id, resp_method);

        return resp.method.args as T;
    }
}
