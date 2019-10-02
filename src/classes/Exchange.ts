import { EventEmitter } from 'events';

import { IExchange } from '../interfaces/Exchange';
import { EAMQPClasses } from '../interfaces/Protocol';
import ChannelRPC from '../services/ChannelRPC';
import CloseReason from '../utils/CloseReason';
import Channel from './Channel';
import {
    EXCHANGE_DECLARE,
    EXCHANGE_DECLARE_OK,
    EXCHANGE_DELETE,
    EXCHANGE_DELETE_OK
} from '../protocol/exchange';

export class ExchangeNameInvalidError extends Error {
    constructor(name: string) {
        super(`Exchange name '${name}' is not acceptable.`);
    }
}

export class ExchangeNotFoundError extends CloseReason {}
export class ExchangeInUseError extends CloseReason {}

export class Exchange extends EventEmitter {
    private rpc: ChannelRPC;

    public constructor(ch: Channel) {
        super();
        this.rpc = new ChannelRPC(ch, EAMQPClasses.EXCHANGE);
    }

    private validate(name: string) {
        if (name.substr(0, 4) === 'amq.') {
            throw new ExchangeNameInvalidError(name);
        }
    }

    public async declare(exchange: IExchange, passive = false): Promise<void> {
        this.validate(exchange.name);

        const args: Record<string, unknown> = {};

        if (exchange.arguments && exchange.arguments.alternameExchange) {
            args['x-altername-exchange'] = exchange.arguments.alternameExchange;
        }

        try {
            return await this.rpc.call<void>(EXCHANGE_DECLARE, EXCHANGE_DECLARE_OK, {
                reserved1: 0,
                exchange: exchange.name,
                type: exchange.type,
                passive,
                durable: exchange.durable,
                reserved2: 0,
                reserved3: 0,
                no_wait: false,
                arguments: args
            });
        } catch (ex) {
            if (ex instanceof CloseReason) {
                throw new ExchangeNotFoundError(ex);
            }

            throw ex;
        }
    }

    public async delete(name: string, if_unused = true): Promise<void> {
        try {
            return await this.rpc.call<void>(EXCHANGE_DELETE, EXCHANGE_DELETE_OK, {
                reserved1: 0,
                exchange: name,
                if_unused: if_unused,
                no_wait: false
            });
        } catch (ex) {
            if (ex instanceof CloseReason) {
                throw new ExchangeInUseError(ex);
            }

            throw ex;
        }
    }
}
