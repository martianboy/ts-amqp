import { EventEmitter } from "events";

export enum EChannelFlowState {
    active = 0,
    inactive = 1
};

export interface IChannel extends EventEmitter {
    channelNumber: number;

    sendMethod(class_id: number, method_id: number, args: Object): void;
    open(): void;
    flow(active: EChannelFlowState): void;
    close(): void;
}