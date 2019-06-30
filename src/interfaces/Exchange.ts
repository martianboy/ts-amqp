export type EExchangeType = 'direct' | 'fanout' | 'topic' | 'headers';

export interface IExchange {
    name: string;
    type: EExchangeType;
    durable: boolean;
    arguments: Record<string, any>;
}
