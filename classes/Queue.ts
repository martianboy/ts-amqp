import { EventEmitter } from 'events';

import ChannelRPC from '../utils/ChannelRPC';
import { IChannel } from '../interfaces/Channel';
import { EAMQPClasses } from '../interfaces/Protocol';
import {
    IQueue,
    IQueueDeclareResponse,
    IBinding,
    IQueuePurgeResponse
} from '../interfaces/Queue';
import CloseReason from '../utils/CloseReason';

const QUEUE_DECLARE = 10;
const QUEUE_DECLARE_OK = 11;

const QUEUE_BIND = 20;
const QUEUE_BIND_OK = 21;

const QUEUE_UNBIND = 50;
const QUEUE_UNBIND_OK = 51;

const QUEUE_PURGE = 30;
const QUEUE_PURGE_OK = 31;

const QUEUE_DELETE = 40;
const QUEUE_DELETE_OK = 41;

export class QueueNameInvalidError extends Error {
    constructor(name: string) {
        super(`Queue name '${name}' is not acceptable.`);
    }
}

export class QueueAccessRefusedError extends CloseReason {}
export class QueueLockedError extends CloseReason {}
export class QueueNotFoundError extends CloseReason {}

export class Queue extends EventEmitter {
    private rpc: ChannelRPC;

    private validate(name: string) {
        if (name.substr(0, 4) === 'amq.') {
            throw new QueueNameInvalidError(name);
        }
    }

    public constructor(ch: IChannel) {
        super();
        this.rpc = new ChannelRPC(ch, EAMQPClasses.QUEUE);
    }

    public async declare(
        queue: IQueue,
        passive: boolean = false,
        no_wait: boolean = false
    ) {
        this.validate(queue.name);

        try {
            return await this.rpc.call<IQueueDeclareResponse>(
                QUEUE_DECLARE,
                QUEUE_DECLARE_OK,
                {
                    reserved1: 0,
                    queue: queue.name,
                    passive,
                    durable: queue.durable,
                    exclusive: queue.exclusive,
                    auto_delete: queue.auto_delete,
                    no_wait,
                    arguments: {}
                }
            );
        } catch (ex) {
            if (ex instanceof CloseReason) {
                switch (ex.reply_code) {
                    case 403:
                        throw new QueueAccessRefusedError(ex);
                    case 404:
                        throw new QueueNotFoundError(ex);
                    case 405:
                        throw new QueueLockedError(ex);
                }
            }

            throw ex;
        }
    }

    public bind(binding: IBinding, no_wait: boolean = false) {
        return this.rpc.call<void>(QUEUE_BIND, QUEUE_BIND_OK, {
            reserved1: 0,
            queue: binding.queue,
            exchange: binding.exchange,
            routing_key: binding.routing_key,
            no_wait,
            arguments: {}
        });
    }

    public unbind(binding: IBinding) {
        return this.rpc.call<void>(QUEUE_UNBIND, QUEUE_UNBIND_OK, {
            reserved1: 0,
            queue: binding.queue,
            exchange: binding.exchange,
            routing_key: binding.routing_key,
            arguments: {}
        });
    }

    public async purge(queue: string, no_wait: boolean = false) {
        try {
            return await this.rpc.call<IQueuePurgeResponse>(
                QUEUE_PURGE,
                QUEUE_PURGE_OK,
                {
                    reserved1: 0,
                    queue,
                    no_wait
                }
            );
        } catch (ex) {
            if (ex instanceof CloseReason) {
                if (ex.reply_code === 404) {
                    throw new QueueNotFoundError(ex);
                }
            }

            throw ex;
        }
    }

    public async delete(
        queue: string,
        if_unused: boolean = false,
        if_empty: boolean = false,
        no_wait: boolean = false
    ) {
        try {
            return await this.rpc.call<IQueuePurgeResponse>(
                QUEUE_DELETE,
                QUEUE_DELETE_OK,
                {
                    reserved1: 0,
                    queue,
                    if_unused,
                    if_empty,
                    no_wait
                }
            );
        } catch (ex) {
            if (ex instanceof CloseReason) {
                if (ex.reply_code === 404) {
                    throw new QueueNotFoundError(ex);
                }
            }

            throw ex;
        }
    }
}
