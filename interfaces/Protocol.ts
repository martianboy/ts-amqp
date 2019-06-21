export enum EAMQPClasses {
    CONNECTION = 10,
    CHANNEL = 20,
    EXCHANGE = 40,
    QUEUE = 50,
    BASIC = 60
}

export enum EFrameTypes {
    FRAME_METHOD = 1,
    FRAME_HEADER = 0,
    FRAME_BODY = 3,
    FRAME_HEARTBEAT = 8
}

export interface IFrameHeader {
    type: EFrameTypes;
    channel: number;
    payload_size: number;
}

export interface IMethod {
    class_id: EAMQPClasses;
    method_id: number;
    args: any;
}

export interface IContentHeaderProperties {
    contentType?: string;
    contentEncoding?: string;
    headers?: Record<string, any>;
    deliveryMode?: number;
    priority?: number;
    correlationId?: string;
    replyTo?: string;
    expiration?: string;
    messageId?: string;
    timestamp?: bigint;
    type?: string;
    userId?: string;
    appId?: string;
    clusterId?: string;
}

interface IFrameBase {
    channel: number;
}

export interface IMethodFrame extends IFrameBase {
    type: EFrameTypes.FRAME_METHOD;
    method: IMethod;
}

interface IHeartbeatFame extends IFrameBase {
    type: EFrameTypes.FRAME_HEARTBEAT;
}

export interface IHeader {
    class_id: EAMQPClasses;
    body_size: bigint;

    properties: IContentHeaderProperties;
}

export interface IHeaderFrame extends IFrameBase {
    type: EFrameTypes.FRAME_HEADER;
    header: IHeader;
}

export interface IBodyFrame extends IFrameBase {
    type: EFrameTypes.FRAME_BODY;
    payload: Buffer;
}

export type IFrame = IMethodFrame | IHeaderFrame | IHeartbeatFame | IBodyFrame;

export interface ICloseReason {
    reply_code: number;
    reply_text: string;
    class_id: EAMQPClasses;
    method_id: number;
}

export interface ICommand {
    channel: number;

    method: IMethod;
    header?: IHeader;
    body?: Buffer;
}
