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
    deliveryTag: number;
    redeliver: boolean;
    exchange: string;
    routingKey: string;
}

export interface IDelivery {
    envelope: IEnvelope;
    properties: IBasicProperties;
    body: Buffer;
}