import { EventEmitter } from 'events';

import { IExchange } from '../interfaces/Exchange';
import { ICloseReason, EAMQPClasses } from '../interfaces/Protocol';
import ChannelRPC from '../utils/ChannelRPC';
import { IChannel } from '../interfaces/Channel';
import CloseReason from '../utils/CloseReason';

const EXCHANGE_DECLARE = 10;
const EXCHANGE_DECLARE_OK = 11;

const EXCHANGE_DELETE = 20;
const EXCHANGE_DELETE_OK = 21;

export class ExchangeNotFoundError extends CloseReason {}
export class ExchangeInUseError extends CloseReason {}

export class Exchange extends EventEmitter {
    rpc: ChannelRPC;

    public constructor(ch: IChannel) {
        super();
        this.rpc = new ChannelRPC(ch, EAMQPClasses.EXCHANGE);
    }

    public declare(
        exchange: IExchange,
        passive: boolean = false,
        no_wait: boolean = false
    ): Promise<void> {
        return this.rpc
            .call<void>(EXCHANGE_DECLARE, EXCHANGE_DECLARE_OK, {
                reserved1: 0,
                exchange: exchange.name,
                type: exchange.type,
                passive,
                durable: exchange.durable,
                reserved2: 0,
                reserved3: 0,
                no_wait,
                arguments: exchange.arguments
            })
            .catch((reason: ICloseReason) => {
                throw new ExchangeNotFoundError(reason);
            });
    }

    public delete(
        name: string,
        if_unused: boolean = true,
        no_wait: boolean = false
    ): Promise<void> {
        return this.rpc
            .call<void>(EXCHANGE_DELETE, EXCHANGE_DELETE_OK, {
                reserved1: 0,
                exchange: name,
                if_unused: if_unused,
                no_wait: no_wait
            })
            .catch((reason: ICloseReason) => {
                throw new ExchangeInUseError(reason);
            });
    }
}
