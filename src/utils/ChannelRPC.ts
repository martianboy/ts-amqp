import { Mutex } from 'async-mutex';
import debugFn from 'debug';
const debug = debugFn('ts-amqp');

import { ICloseReason, EAMQPClasses, ICommand } from '../interfaces/Protocol';
import Channel from '../classes/Channel';
import { CHANNEL_CLOSE } from '../protocol/channel';
import CloseReason from './CloseReason';
import { AmqpOperationTimeout } from '../protocol/exceptions';

let counter = 0;

export default class ChannelRPC {
    private ch: Channel;
    private class_id: EAMQPClasses;

    private mutex = new Mutex();
    private settled?: boolean;
    private settle_timeout?: NodeJS.Timeout;

    public constructor(ch: Channel, class_id: EAMQPClasses) {
        this.ch = ch;
        this.class_id = class_id;
    }

    private timeout(milliseconds: number): Promise<unknown> {
        return new Promise((_, rej) => {
            this.settle_timeout = setTimeout(() => {
                this.settle();
                rej(new AmqpOperationTimeout());
            }, milliseconds);
        });
    }

    private settle() {
        if (this.settle_timeout) {
            clearTimeout(this.settle_timeout);
            this.settled = true;
            this.settle_timeout = undefined;
        }
    }

    public async waitFor<T>(
        class_id: EAMQPClasses,
        method_id: number,
        original_method_id: number,
        acceptable?: (args: T) => boolean
    ): Promise<ICommand> {
        debug(`RPC#${counter}: waitFor ${class_id}:${method_id}`);

        for await (const command of this.ch) {
            if (this.settled) break;

            const m = command.method;

            if (m.class_id === class_id && m.method_id === method_id) {
                debug(`RPC#${counter}: received ${m.class_id}:${m.method_id}`);
                if (typeof acceptable === 'function' && !acceptable(m.args as T)) {
                    console.warn();
                    continue;
                }
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

    private async doCall<T>(
        method: number,
        resp_method: number,
        args: unknown,
        acceptable?: (args: T) => boolean
    ): Promise<T> {
        counter += 1;
        this.settled = false;

        debug(`RPC#${counter}: call ${this.class_id}:${method}`);

        this.ch.write({
            class_id: this.class_id,
            method_id: method,
            args
        });

        const resp = await this.waitFor<T>(this.class_id, resp_method, method, acceptable);

        this.settle();
        return resp.method.args as T;
    }

    public async call<T>(
        method: number,
        resp_method: number,
        args: unknown,
        acceptable?: (args: T) => boolean
    ): Promise<T> {
        const release = await this.mutex.acquire();

        try {
            return await Promise.race([
                this.timeout(20000) as Promise<T>,
                this.doCall(method, resp_method, args, acceptable)
            ]);
        } finally {
            release();
        }
    }
}
