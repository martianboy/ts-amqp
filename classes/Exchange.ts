import { EventEmitter } from 'events';

import { IExchange } from '../interfaces/Exchange';
import { EAMQPClasses } from '../interfaces/Protocol';
import ChannelRPC from '../utils/ChannelRPC';
import { IChannel } from '../interfaces/Channel';
import CloseReason from '../utils/CloseReason';

const EXCHANGE_DECLARE = 10;
const EXCHANGE_DECLARE_OK = 11;

const EXCHANGE_DELETE = 20;
const EXCHANGE_DELETE_OK = 21;

export class ExchangeNameInvalidError extends Error {
    constructor(name: string) {
        super(`Exchange name '${name}' is not acceptable.`);
    }
}

export class ExchangeNotFoundError extends CloseReason {}
export class ExchangeInUseError extends CloseReason {}

export class Exchange extends EventEmitter {
    private rpc: ChannelRPC;

    public constructor(ch: IChannel) {
        super();
        this.rpc = new ChannelRPC(ch, EAMQPClasses.EXCHANGE);
    }

    private validate(name: string) {
        if (name.substr(0, 4) === 'amq.') {
            throw new ExchangeNameInvalidError(name);
        }
    }

    public async declare(
        exchange: IExchange,
        passive: boolean = false,
        no_wait: boolean = false
    ): Promise<void> {
        this.validate(exchange.name);

        try {
            return await this.rpc.call<void>(
                EXCHANGE_DECLARE,
                EXCHANGE_DECLARE_OK,
                {
                    reserved1: 0,
                    exchange: exchange.name,
                    type: exchange.type,
                    passive,
                    durable: exchange.durable,
                    reserved2: 0,
                    reserved3: 0,
                    no_wait,
                    arguments: exchange.arguments
                }
            );
        } catch (ex) {
            if (ex instanceof CloseReason) {
                throw new ExchangeNotFoundError(ex);
            }

            throw ex;
        }
    }

    public async delete(
        name: string,
        if_unused: boolean = true,
        no_wait: boolean = false
    ): Promise<void> {
        try {
            return await this.rpc.call<void>(
                EXCHANGE_DELETE,
                EXCHANGE_DELETE_OK,
                {
                    reserved1: 0,
                    exchange: name,
                    if_unused: if_unused,
                    no_wait: no_wait
                }
            );
        } catch (ex) {
            if (ex instanceof CloseReason) {
                throw new ExchangeInUseError(ex);
            }

            throw ex;
        }
    }
}
