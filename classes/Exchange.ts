import { EventEmitter } from "events";
import { IExchange } from "../interfaces/Exchange";
import { IChannel } from "../interfaces/Channel";
import { ICloseReason, EAMQPClasses } from "../interfaces/Protocol";

export const EXCHANGE_CLASS = 40;

export const EXCHANGE_DECLARE = 10;
export const EXCHANGE_DECLARE_OK = 11;

export const EXCHANGE_DELETE = 20;
export const EXCHANGE_DELETE_OK = 21;

export class ExchangeNotFoundError extends Error {}
export class ExchangeInUseError extends Error {}

export class Exchange extends EventEmitter {
    public constructor(private ch: IChannel) {
        super();
    }

    private expectCommand(method: number, callback: (...args: any[]) => void) {
        this.ch.once(`method:${EXCHANGE_CLASS}:${method}`, callback);
    }

    private rpc<T>(method: number, resp_method: number, args: any): Promise<T> {
        var already_resolved = false;

        return new Promise((resolve, reject) => {
            this.ch.sendMethod(EXCHANGE_CLASS, method, args);
            if (args.no_wait) {
                already_resolved = true;
                return resolve();
            }
            else {
                this.expectCommand(resp_method, (args: any) => {
                    already_resolved = true;
                    this.ch.off('closing', onError);
                    resolve(args);
                });
            }

            const onError = (reason: ICloseReason) => {
                if (already_resolved) return;

                if (
                    reason.class_id === EAMQPClasses.EXCHANGE &&
                    reason.method_id === method &&
                    reason.reply_code >= 400            // Is it possible that server closes with a < 400 code?
                ) {
                    reject(reason);
                }
            }

            this.ch.once('closing', onError);
        });
    }

    public declare(exchange: IExchange, passive: boolean = false, no_wait: boolean = false): Promise<void> {
        return this.rpc<void>(EXCHANGE_DECLARE, EXCHANGE_DECLARE_OK, {
            reserved1: 0,
            exchange: exchange.name,
            type: exchange.type,
            passive,
            durable: exchange.durable,
            reserved2: 0,
            reserved3: 0,
            no_wait,
            arguments: exchange.arguments,
        }).catch((reason: ICloseReason) => {
            throw new ExchangeNotFoundError(reason.reply_text);
        });
    }

    public delete(name: string, if_unused: boolean = true, no_wait: boolean = false): Promise<void> {
        return this.rpc<void>(EXCHANGE_DELETE, EXCHANGE_DELETE_OK, {
            reserved1: 0,
            exchange: name,
            if_unused: if_unused,
            no_wait: no_wait,
        }).catch((reason: ICloseReason) => {
            throw new ExchangeInUseError(reason.reply_text);
        });
    }
}