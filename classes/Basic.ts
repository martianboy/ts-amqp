import { EventEmitter } from 'events';

import ChannelRPC from '../utils/ChannelRPC';
import { EAMQPClasses } from '../interfaces/Protocol';
import { IBasicConsumeResponse, IBasicGetResponse } from '../interfaces/Basic';
import {
    BASIC_CONSUME,
    BASIC_CONSUME_OK,
    BASIC_CANCEL,
    BASIC_CANCEL_OK,
    BASIC_GET,
    BASIC_GET_OK,
    BASIC_PUBLISH,
    BASIC_ACK
} from '../protocol/basic';
import ChannelN from './ChannelN';

export class Basic extends EventEmitter {
    private rpc: ChannelRPC;
    private ch: ChannelN;

    public constructor(ch: ChannelN) {
        super();
        this.ch = ch;
        this.rpc = new ChannelRPC(ch, EAMQPClasses.BASIC);
    }

    public async consume(
        queue_name: string,
        no_local: boolean = false,
        no_ack: boolean = false,
        exclusive: boolean = false,
        no_wait: boolean = false,
        args: Record<string, any> = {}
    ) {
        return await this.rpc.call<IBasicConsumeResponse>(
            BASIC_CONSUME,
            BASIC_CONSUME_OK,
            {
                reserved1: 0,
                queue: queue_name,
                consumer_tag: '',
                no_local,
                no_ack,
                exclusive,
                no_wait,
                arguments: args
            }
        );
    }

    public async cancel(consumer_tag: string, no_wait: boolean = false) {
        return await this.rpc.call<IBasicConsumeResponse>(
            BASIC_CANCEL,
            BASIC_CANCEL_OK,
            {
                consumer_tag,
                no_wait
            }
        );
    }

    public async get(queue: string, no_ack: boolean = false) {
        return await this.rpc.call<IBasicGetResponse>(BASIC_GET, BASIC_GET_OK, {
            reserved1: 0,
            queue,
            no_ack
        });
    }

    public publish(
        exchange_name: string | null,
        routing_key: string,
        mandatory: boolean,
        immediate: boolean,
        body: Buffer
    ) {
        if (!exchange_name) exchange_name = '';

        this.ch.write({
            class_id: EAMQPClasses.BASIC,
            method_id: BASIC_PUBLISH,
            args: {
                reserved1: 0,
                exchange_name,
                routing_key,
                mandatory,
                immediate
            },
            properties: {},
            body
        });
    }

    public ack(delivery_tag: bigint, multiple: boolean) {
        this.ch.write({
            class_id: EAMQPClasses.BASIC,
            method_id: BASIC_ACK,
            args: {
                delivery_tag,
                multiple
            }
        });
    }

    }
}
