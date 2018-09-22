import { EventEmitter } from "events";
import { EAMQPClasses } from "./Protocol";

export enum EChannelFlowState {
    active = 0,
    inactive = 1
};

export interface IChannel extends EventEmitter {
    channelNumber: number;

    sendMethod(class_id: EAMQPClasses, method_id: number, args: Object): void;
    open(): void;
    flow(active: EChannelFlowState): void;
    close(): void;
}