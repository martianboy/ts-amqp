import { EventEmitter } from "events";

export interface IConnectionOptions {

}

export enum EConnState {
    closing = -1,
    closed = 0,
    handshake = 1,
    open = 2
};

export interface IConnection extends EventEmitter {
    start();
    sendFrame(frame: Buffer);
    sendMethod(class_id: number, method_id: number, args: Object);

    state: EConnState;
}

export interface IStartServer {
    version_major: number;
    version_minor: number;
    server_properties: any;
    mechanisms: string;
    locales: string;
}