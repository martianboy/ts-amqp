import { EventEmitter } from 'events';

import ChannelRPC from '../utils/ChannelRPC';
import { EAMQPClasses } from '../interfaces/Protocol';
import {
    IQueue,
    IQueueDeclareResponse,
    IBinding,
    IQueuePurgeResponse,
    IQueueArgs
} from '../interfaces/Queue';
import CloseReason from '../utils/CloseReason';
import Channel from './Channel';
import {
    QUEUE_DECLARE,
    QUEUE_DECLARE_OK,
    QUEUE_BIND,
    QUEUE_BIND_OK,
    QUEUE_UNBIND,
    QUEUE_UNBIND_OK,
    QUEUE_PURGE,
    QUEUE_PURGE_OK,
    QUEUE_DELETE,
    QUEUE_DELETE_OK
} from '../protocol/queue';

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

    public constructor(ch: Channel) {
        super();
        this.rpc = new ChannelRPC(ch, EAMQPClasses.QUEUE);
    }

    public async declare(queue: IQueue, passive: boolean = false) {
        this.validate(queue.name);

        const QUEUE_ARGS_MAP = {
            deadLetterExchange: 'x-dead-letter-exchange',
            deadLetterRoutingKey: 'x-dead-letter-routing-key',
            expires: 'x-expires',
            lazy: 'x-queue-mode',
            maxLength: 'x-max-length',
            maxLengthBytes: 'x-max-length-bytes',
            maxPriority: 'x-max-priority',
            messageTtl: 'x-message-ttl',
            overflow: 'x-overflow',
            queueMasterLocator: 'x-queue-master-locator',
        };

        // eslint-disable-next-line
        const keys: Array<keyof IQueueArgs> = queue.arguments ? Object.keys(queue.arguments) as Array<keyof IQueueArgs> : [];

        const queue_args = keys.reduce(
            (args: Record<string, unknown>, k: keyof IQueueArgs) => {
                return {
                    ...args,
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    [QUEUE_ARGS_MAP[k] || k]: queue.arguments![k]
                };
            },
            {}
        )

        try {
            const resp = await this.rpc.call<IQueueDeclareResponse>(
                QUEUE_DECLARE,
                QUEUE_DECLARE_OK,
                {
                    reserved1: 0,
                    queue: queue.name,
                    passive,
                    durable: queue.durable,
                    exclusive: queue.exclusive,
                    auto_delete: queue.auto_delete,
                    no_wait: false,
                    arguments: queue_args
                }
            );

            return resp;
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

    public bind(binding: IBinding) {
        return this.rpc.call<void>(QUEUE_BIND, QUEUE_BIND_OK, {
            reserved1: 0,
            queue: binding.queue,
            exchange: binding.exchange,
            routing_key: binding.routing_key,
            no_wait: false,
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

    public async purge(queue: string) {
        try {
            return await this.rpc.call<IQueuePurgeResponse>(
                QUEUE_PURGE,
                QUEUE_PURGE_OK,
                {
                    reserved1: 0,
                    queue,
                    no_wait: false
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
        if_empty: boolean = false
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
                    no_wait: false
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
