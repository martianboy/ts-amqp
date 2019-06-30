import { TUnknownArgs } from "./Protocol";

export interface IQueue {
    name: string;
    durable: boolean;
    exclusive: boolean;
    auto_delete: boolean;
    arguments: TUnknownArgs;
}

export interface IQueueDeclareResponse {
    queue: string;
    message_count: number;
    consumer_count: number;
}

export interface IBinding {
    queue: string;
    exchange: string;
    routing_key: string;
}

export interface IQueuePurgeResponse {
    message_count: number;
}