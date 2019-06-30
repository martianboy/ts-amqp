import { TUnknownArgs } from "./Protocol";

export type EExchangeType = 'direct' | 'fanout' | 'topic' | 'headers';

export interface IExchange {
    name: string;
    type: EExchangeType;
    durable: boolean;
    arguments: TUnknownArgs;
}
