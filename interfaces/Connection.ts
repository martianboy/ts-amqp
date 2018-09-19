import { EventEmitter } from "events";
import { IFrame } from "./Protocol";

export enum EConnState {
    closing = -1,
    closed = 0,
    handshake = 1,
    open = 2
};

export interface IConnection extends EventEmitter {
    start();
    sendFrame(frame: IFrame);
    sendMethod(class_id: number, method_id: number, args: Object);

    state: EConnState;
}

export interface IConnectionParams {
    host: string;
    port: number;
    username: string;
    password: string;
    locale: string;

    vhost: string;
}

export const DEFALT_CONNECTION_PARAMS: IConnectionParams = {
    host: 'localhost',
    port: 5672,
    username: 'guest',
    password: 'guest',
    locale: 'en_US',
    vhost: '/'
}