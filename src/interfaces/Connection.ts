import { EventEmitter } from 'events';
import { IFrame, ICommand } from './Protocol';

export enum EConnState {
    closing,
    closed,
    connecting,
    handshake,
    open,
}

export interface IConnection extends EventEmitter {
    start(): void;
    sendFrame(frame: IFrame): void;
    sendCommand(command: ICommand): void;

    state: EConnState;
    connectionParameters: IConnectionParams;
}

export interface ITuneArgs {
    channel_max: number;
    frame_max: number;
    heartbeat: number;
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