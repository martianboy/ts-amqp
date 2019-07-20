import { EAMQPClasses, IBasicProperties } from "./Protocol";

export enum EChannelFlowState {
    active = 0,
    inactive = 1
}

export interface IWritableCommand {
    class_id: EAMQPClasses;
    method_id: number;
    args: Record<string, unknown>;
    properties?: IBasicProperties;
    body?: Buffer;
}
