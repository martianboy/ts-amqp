import * as AMQP from '../protocol';

import { connect, Socket } from 'net';
import { EventEmitter } from 'events';
import debugFn from 'debug';
const debug = debugFn('amqp:connection');

import { IConnection, EConnState, IConnectionParams, ITuneArgs } from '../interfaces/Connection';

import HeartbeatService from '../services/Heartbeat';
import { IFrame, ICloseReason, ICommand } from '../interfaces/Protocol';
import Channel0 from './Channel0';
import ChannelManager, { UnknownChannelError } from '../services/ChannelManager';
import ChannelN from './ChannelN';
import CommandReader from '../services/CommandReader';
import CommandWriter from '../services/CommandWriter';

const DEFAULT_CONNECTION_PARAMS: IConnectionParams = {
    maxRetries: 1,
    retryDelay: 0,
    host: 'localhost',
    port: 5672,
    username: 'guest',
    password: 'guest',
    locale: 'en_US',
    vhost: '/',
    keepAlive: false,
    timeout: 0
};

export default class Connection extends EventEmitter implements IConnection {
    protected socket: Socket = new Socket();
    protected connection_state: EConnState = EConnState.closed;
    protected retry_timeout?: NodeJS.Timeout;
    protected params: IConnectionParams;

    protected heartbeat_service: HeartbeatService;
    protected channelManager: ChannelManager = new ChannelManager(0);
    protected channel0: Channel0;

    protected connection_attempts = 0;
    protected open_promise_resolve?: () => void;
    protected open_promise_reject?: <E extends Error>(ex: E) => void;

    protected command_reader = new CommandReader();
    protected command_writer = new CommandWriter();

    public constructor(params: Partial<IConnectionParams> = DEFAULT_CONNECTION_PARAMS) {
        super();

        this.params = {
            maxRetries: params.maxRetries || DEFAULT_CONNECTION_PARAMS.maxRetries,
            retryDelay: params.retryDelay || DEFAULT_CONNECTION_PARAMS.retryDelay,
            host: params.host || DEFAULT_CONNECTION_PARAMS.host,
            port: params.port || DEFAULT_CONNECTION_PARAMS.port,
            username: params.username || DEFAULT_CONNECTION_PARAMS.username,
            password: params.password || DEFAULT_CONNECTION_PARAMS.password,
            locale: params.locale || DEFAULT_CONNECTION_PARAMS.locale,
            vhost: params.vhost || DEFAULT_CONNECTION_PARAMS.vhost,
            timeout: params.timeout || DEFAULT_CONNECTION_PARAMS.timeout,
            keepAlive: params.keepAlive || DEFAULT_CONNECTION_PARAMS.keepAlive,
            keepAliveDelay: params.keepAliveDelay || DEFAULT_CONNECTION_PARAMS.keepAliveDelay
        };

        this.heartbeat_service = new HeartbeatService();
        this.channel0 = new Channel0(this);

        this.command_reader.on('data', this.onCommand);
        this.command_reader.on('error', () => this.close());
    }

    public get connectionParameters() {
        return this.params;
    }

    public get state(): EConnState {
        return this.connection_state;
    }

    protected onSocketDrain = () => {
        this.emit('drain');
    }

    protected attachSocketEventHandlers() {
        this.command_writer.on('drain', this.onSocketDrain);
        this.socket.on('connect', this.onSockConnect);
        this.socket.on('close', this.onSockClose);
        this.socket.on('error', this.onSockError);
        this.socket.on('timeout', this.onSockTimeout);
    }

    protected detachSocketEventHandlers() {
        this.command_writer.off('drain', this.onSocketDrain);
        this.socket.off('connect', this.onSockConnect);
        this.socket.off('close', this.onSockClose);
        this.socket.off('error', this.onSockError);
        this.socket.off('timeout', this.onSockTimeout);
    }

    protected onSockConnect = () => {
        this.command_writer
            .pipe(this.socket)
            .pipe(this.command_reader);

        this.socket.setKeepAlive(this.params.keepAlive, this.params.keepAliveDelay);
        if (this.params.timeout) this.socket.setTimeout(this.params.timeout);

        this.channel0.once('tune', this.onTune);
        this.channel0.once('open', this.onOpen);

        this.socket.write(Buffer.from(AMQP.PROTOCOL_HEADER));

        this.channel0.start();
        this.connection_state = EConnState.handshake;
    };

    protected onFrame = (frame: IFrame) => {
        this.emit('frame', frame);
    };

    private onCommand = (command: ICommand) => {
        this.emit('command', command);

        if (command.channel === 0) {
            this.channel0.handleCommand(command);
        } else {
            const ch = this.channelManager.getChannel(command.channel);
            if (!ch) throw new Error('Invalid channel number!');

            ch.handleCommand(command);
        }
    };

    protected onSockError = (err: Error & { code: string }) => {
        switch (err.code) {
            case 'ECONNREFUSED':
                if (
                    this.connection_attempts < this.params.maxRetries &&
                    this.state === EConnState.connecting
                ) {
                    this.retry_timeout = setTimeout(() => {
                        this.cleanup();
                        this.tryStart();
                    }, this.params.retryDelay);
                } else {
                    if (this.open_promise_reject) this.open_promise_reject(err);
                    this.emit('connection:failed');
                }

                break;
            default:
                console.error(err);
        }
    };

    protected onSockTimeout = () => {
        this.emit('timeout');
        this.emit('connection:failed');
        if (this.open_promise_reject)
            this.open_promise_reject(new Error('Timeout while connecting to the server.'));

        debug('Timeout while connecting to the server.');
    };

    protected onSockClose = (had_error: boolean) => {
        if (
            this.connection_attempts === this.params.maxRetries ||
            this.state === EConnState.closing
        ) {
            this.connection_state = EConnState.closed;
        }

        this.heartbeat_service.unpipe();
        this.heartbeat_service.destroy();

        if (had_error) {
            debug('Close: An error occured.');
        } else {
            debug('Close: connection closed successfully.');
        }
    };

    public cleanup() {
        if (this.socket) {
            this.detachSocketEventHandlers();
        }
    }

    public start() {
        return new Promise<void>((res, rej) => {
            this.connection_attempts = 0;
            this.open_promise_resolve = res;
            this.open_promise_reject = rej;

            this.tryStart();
        });
    }

    private tryStart() {
        this.retry_timeout = undefined;
        this.connection_attempts++;
        this.connection_state = EConnState.connecting;

        this.socket = connect({
            host: this.params.host,
            port: this.params.port
        });

        this.attachSocketEventHandlers();
    }

    public sendCommand(command: ICommand): boolean {
        if (this.state === EConnState.closed) {
            throw new Error('Connection#sendCommand(): connection is not open!');
        }

        return this.command_writer.write(command);
    }

    private onTune = (args: ITuneArgs) => {
        this.emit('tune', args);

        this.heartbeat_service = new HeartbeatService();
        this.heartbeat_service.pipe(this.socket);
        this.heartbeat_service.rate = args.heartbeat;

        this.command_writer.frameMax = args.frame_max;

        this.channelManager = new ChannelManager(args.channel_max);
    };

    protected onOpen = () => {
        this.connection_state = EConnState.open;
        this.emit('open');

        if (this.open_promise_resolve) this.open_promise_resolve();

        this.channel0.once('closing', this.onClose);
    };

    public async close() {
        const state = this.state;

        if (state !== EConnState.closed && state !== EConnState.closing) {
            this.connection_state = EConnState.closing;

            if (this.retry_timeout) {
                clearTimeout(this.retry_timeout);
                this.retry_timeout = undefined;
            }
        }

        if (state === EConnState.open) {
            this.emit('closing');
            await this.channelManager.closeAll();

            const reason = await this.channel0.close();
            await this._closeConnection(reason);
        }
    }

    protected onClose = (reason: ICloseReason) => {
        this.emit('closing', reason);
        this.channel0.once('channelClose', this._closeConnection);

        this.connection_state = EConnState.closing;

        debug('closing...');
        debug('Close Reason:', reason);
    };

    protected _closeConnection = (reason: ICloseReason): Promise<ICloseReason> => {
        return new Promise(resolve => {
            this.socket.end(() => {
                this.socket.destroy();
                this.emit('close', reason);
                resolve(reason);
            });
        });
    };

    public async channel(channelNumber?: number): Promise<ChannelN> {
        if (channelNumber) {
            try {
                const ch = this.channelManager.getChannel(channelNumber);

                return ch;
            } catch (ex) {
                if (ex instanceof UnknownChannelError) {
                    return this.channelManager.createChannel(this, channelNumber);
                }

                throw ex;
            }
        }

        return this.channelManager.createChannel(this);
    }
}
