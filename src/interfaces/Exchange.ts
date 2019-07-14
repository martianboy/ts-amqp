export type EExchangeType = 'direct' | 'fanout' | 'topic' | 'headers';

export interface IExchangeArgs {
    alternameExchange?: string;
}

export interface IExchange {
    name: string;
    type: EExchangeType;
    durable: boolean;
    arguments?: IExchangeArgs;
}
