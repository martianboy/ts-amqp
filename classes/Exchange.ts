import { EventEmitter } from "events";
import { IExchange } from "../interfaces/Exchange";
import { IChannel } from "../interfaces/Channel";

export const EXCHANGE_CLASS = 40;

export const EXCHANGE_DECLARE = 10;
export const EXCHANGE_DECLARE_OK = 11;

export const EXCHANGE_DELETE = 20;
export const EXCHANGE_DELETE_OK = 21;

export class Exchange extends EventEmitter {
    public constructor(private ch: IChannel) {
        super();
    }

    private expectCommand(method_id: number, callback: (...args: any[]) => void) {
        this.ch.once(`method:${EXCHANGE_CLASS}:${method_id}`, callback);
    }

    private rpc<T>(method: number, resp_method: number, args: any): Promise<T> {
        return new Promise((resolve) => {
            this.ch.sendMethod(EXCHANGE_CLASS, method, args);
            if (args.no_wait) {
                resolve();
            }
            else {
                this.expectCommand(resp_method, () => {
                    resolve();
                });
            }
        });
    }

    public declare(exchange: IExchange): Promise<void> {
        return this.rpc(EXCHANGE_DECLARE, EXCHANGE_DECLARE_OK, {
            reserved1: 0,
            exchange: exchange.name,
            type: exchange.type,
            passive: exchange.passive,
            durable: exchange.durable,
            reserved2: 0,
            reserved3: 0,
            no_wait: exchange.no_wait,
            arguments: exchange.arguments,
        });
    }

    public delete(name: string, if_unused: boolean = true, no_wait: boolean = false): Promise<void> {
        return this.rpc(EXCHANGE_DELETE, EXCHANGE_DELETE_OK, {
            reserved1: 0,
            exchange: name,
            if_unused: if_unused,
            no_wait: no_wait,
        });
    }
}