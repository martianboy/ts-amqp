import debugFn from 'debug';
const debug = debugFn('ts-amqp');

import { ICloseReason, EAMQPClasses, ICommand } from '../interfaces/Protocol';
import Channel from '../classes/Channel';
import { CHANNEL_CLOSE } from '../protocol/channel';
import CloseReason from './CloseReason';

let counter = 0;

export default class ChannelRPC {
    protected ch: Channel;
    protected class_id: EAMQPClasses;

    public constructor(ch: Channel, class_id: EAMQPClasses) {
        this.ch = ch;
        this.class_id = class_id;
    }

    public async waitFor(
        class_id: EAMQPClasses,
        method_id: number,
        original_method_id: number
    ): Promise<ICommand> {
        debug(`RPC#${counter}: waitFor ${class_id}:${method_id}`);

        for await (const command of this.ch) {
            const m = command.method;

            if (m.class_id === class_id && m.method_id === method_id) {
                debug(`RPC#${counter}: received ${m.class_id}:${m.method_id}`);
                return command;
            } else if (m.class_id === EAMQPClasses.CHANNEL && m.method_id === CHANNEL_CLOSE) {
                const reason = m.args as ICloseReason;
                debug(
                    `RPC#${counter}: received channel.close while waiting for ${class_id}:${method_id}`
                );

                if (
                    reason.class_id === class_id &&
                    reason.method_id === original_method_id &&
                    reason.reply_code >= 400 // Is it possible that server closes with a < 400 code?
                ) {
                    throw new CloseReason(reason);
                }
            }
        }

        debug(
            `RPC#${counter}: channel has been destroyed while waiting for ${class_id}:${method_id}`
        );
        throw new Error(`No response for ${class_id}:${method_id}`);
    }

    public async call<T>(method: number, resp_method: number, args: unknown): Promise<T> {
        counter += 1;

        debug(`RPC#${counter}: call ${this.class_id}:${method}`);

        this.ch.write({
            class_id: this.class_id,
            method_id: method,
            args
        });

        const resp = await this.waitFor(this.class_id, resp_method, method);

        return resp.method.args as T;
    }
}
