export enum EAMQPClasses {
    CONNECTION = 10,
    CHANNEL = 20,
    EXCHANGE = 40
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

interface IHeaderFrame extends IFrameBase {
    type: EFrameTypes.FRAME_HEADER;
}

interface IBodyFrame extends IFrameBase {
    type: EFrameTypes.FRAME_BODY;
}

export type IFrame = IMethodFrame | IHeaderFrame | IHeartbeatFame | IBodyFrame;
