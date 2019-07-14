export interface IQueueArgs {
    deadLetterExchange?: string;
    deadLetterRoutingKey?: string;
    expires?: number;
    lazy?: boolean;
    maxLength?: number;
    maxLengthBytes?: number;
    maxPriority?: number;
    messageTtl?: number;
    overflow?: 'drop-head' | 'reject-publish';
    queueMasterLocator?: boolean;
}

export interface IQueue {
    name: string;
    durable: boolean;
    exclusive: boolean;
    auto_delete: boolean;
    arguments?: IQueueArgs;
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