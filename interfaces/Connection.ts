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
    writeBuffer(buf: Buffer);
    sendFrame(frame: IFrame);
    sendMethod(channel: number, class_id: number, method_id: number, args: Object);

    state: EConnState;
    connectionParameters: IConnectionParams;
}

export interface IConnectionParams {
    maxRetries: number;
    retryDelay: number;
    host: string;
    port: number;
    username: string;
    password: string;
    locale: string;
    keepAlive?: boolean;
    keepAliveDelay?: number;
    timeout?: number;
    vhost: string;
}

export const DEFALT_CONNECTION_PARAMS: IConnectionParams = {
    maxRetries: 1,
    retryDelay: 0,
    host: 'localhost',
    port: 5672,
    username: 'guest',
    password: 'guest',
    locale: 'en_US',
    vhost: '/',
    keepAlive: false,
    timeout: 0,
}