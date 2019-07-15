import { EventEmitter } from 'events';
import { IFrame, ICommand } from './Protocol';

export enum EConnState {
    closing = 'closing',
    closed = 'closed',
    connecting = 'connecting',
    handshake = 'handshake',
    open = 'open',
}

export interface IConnection extends EventEmitter {
    start(): void;
    sendFrame(frame: IFrame): void;
    sendCommand(command: ICommand): void;

    state: EConnState;
    connectionParameters: IConnectionParams;
}

export interface IConnectionStartArgs {
    version_major: number;
    version_minor: number;
    server_properties: Record<string, unknown>;
    mechanisms: string;
    locales: string;
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
