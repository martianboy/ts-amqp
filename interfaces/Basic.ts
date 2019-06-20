export interface IBasicConsumeResponse {
    consumer_tag: string;
}

export interface IBasicGetResponse {
    delivery_tag: bigint;
    redelivered: boolean;
    exchange_name: string;
    routing_key: string;
    message_count: number;
}