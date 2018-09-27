export type EExchangeType = 'direct' | 'fanout' | 'topic' | 'headers';

export interface IExchange {
    name: string;
    type: EExchangeType;
    passive: boolean;
    durable: boolean;
    no_wait: boolean;
    arguments: Record<string, any>;
}
