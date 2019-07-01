import { IBasicProperties } from "./Protocol";

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

export interface IEnvelope {
    deliveryTag: bigint;
    redeliver: boolean;
    exchange: string;
    routingKey: string;
}

export interface IDeliverArgs {
    consumer_tag: string;
    delivery_tag: bigint;
    redeliver: boolean;
    exchange: string;
    routing_key: string;
}

export interface IDelivery {
    envelope: IEnvelope;
    properties: IBasicProperties;
    body?: Buffer;
}

export interface IMessage<B = Buffer> {
    exchange?: string;
    routing_key: string;
    mandatory?: boolean;
    immediate?: boolean;

    properties?: IBasicProperties;
    body?: B;
}