import { connect, Socket } from 'net';
import * as AMQP from '../amqp';
import { EventEmitter } from 'events';
import BufferWriter from '../utils/BufferWriter';
import {
    read_frame,
    build_method_frame,
    write_frame
} from '../utils/Frame';
import {
    IConnection,
    EConnState,
    IConnectionParams,
    DEFAULT_CONNECTION_PARAMS,
    ITuneArgs
} from '../interfaces/Connection';

import HeartbeatService from '../services/Heartbeat';
import { IFrame, EAMQPClasses } from '../interfaces/Protocol';
import Channel0 from './Channel0';
import ChannelManager from '../services/ChannelManager';
import { IChannel } from '../interfaces/Channel';

export default class Connection extends EventEmitter implements IConnection {
    protected socket: Socket = new Socket;
    protected connection_state: EConnState = EConnState.closed;
    protected params: IConnectionParams;

    protected heartbeat_service: HeartbeatService;
    protected channelManager: ChannelManager = new ChannelManager(0);
    protected channel0: Channel0;

    protected connection_attempts: number = 0;
    protected open_promise_resolve?: () => void;
    protected open_promise_reject?: (ex: any) => void;

    public constructor(params: Partial<IConnectionParams> = DEFAULT_CONNECTION_PARAMS) {
        super();

        function param_or_default<K extends keyof IConnectionParams>(k: K): IConnectionParams[K] {
            return params[k] !== undefined ? params[k] : DEFAULT_CONNECTION_PARAMS[k];
        }

        this.params = {
            maxRetries: param_or_default('maxRetries'),
            retryDelay: param_or_default('retryDelay'),
            host: param_or_default('host'),
            port: param_or_default('port'),
            username: param_or_default('username'),
            password: param_or_default('password'),
            locale: param_or_default('locale'),
            vhost: param_or_default('vhost'),
            timeout: param_or_default('timeout'),
            keepAlive: param_or_default('keepAlive'),
            keepAliveDelay: param_or_default('keepAliveDelay'),
        }

        this.heartbeat_service = new HeartbeatService(this);
        this.channel0 = new Channel0(this);
    }

    public get connectionParameters() {
        return this.params;
    }

    public get state(): EConnState {
        return this.connection_state;
    }

    protected attachSocketEventHandlers() {
        this.socket.on("connect", this.onSockConnect);
        this.socket.on("data", this.onSockData);
        this.socket.on("close", this.onSockClose);
        this.socket.on("error", this.onSockError);
        this.socket.on('timeout', this.onSockTimeout);
    }

    protected detachSocketEventHandlers() {
        this.socket.off("connect", this.onSockConnect);
        this.socket.off("data", this.onSockData);
        this.socket.off("close", this.onSockClose);
        this.socket.off("error", this.onSockError);
        this.socket.off('timeout', this.onSockTimeout);
    }

    protected onSockConnect = () => {
        this.socket.setKeepAlive(this.params.keepAlive, this.params.keepAliveDelay);
        if (this.params.timeout)
            this.socket.setTimeout(this.params.timeout);

        this.channel0.once('tune', this.onTune);
        this.channel0.once('open', this.onOpen);

        this.channel0.start();
        this.connection_state = EConnState.handshake;
    }

    protected onSockData = (buf: Buffer) => {
        const frame = read_frame(buf);

        this.emit('frame', frame);
    }

    protected onSockError = (err: any) => {
        switch (err.code) {
            case 'ECONNREFUSED':
                if (this.connection_attempts < this.params.maxRetries) {
                    setTimeout(() => {
                        this.cleanup();
                        this.start();
                    }, this.params.retryDelay);
                }
                else {
                    if (this.open_promise_reject)
                        this.open_promise_reject(new Error('Connection error.'));
                }

                break;
            default:
                console.error(err);
        }
    }

    protected onSockTimeout = () => {
        this.emit('timeout');
        if (this.open_promise_reject)
            this.open_promise_reject(new Error('Timeout while connecting to the server.'));

        console.log("Timeout while connecting to the server.");
    }

    protected onSockClose = (had_error: boolean) => {
        this.connection_state = EConnState.closed;
        this.heartbeat_service.stop();

        if (had_error) {
            console.log('Close: An error occured.');
        }
        else {
            console.log('Close: connection closed successfully.');
        }
    }

    public cleanup() {
        if (this.socket) {
            this.detachSocketEventHandlers();
        }
    }

    public async start() {
        return new Promise((res, rej) => {
            this.open_promise_resolve = res;
            this.open_promise_reject = rej;

            this.connection_attempts++;
    
            this.socket = connect({
                host: this.params.host,
                port: this.params.port
            });
    
            this.attachSocketEventHandlers();
        });
    }

    public sendFrame(frame: IFrame) {
        const buf = write_frame(frame);
        this.socket.write(buf);
    }

    public sendMethod(channel: EAMQPClasses, class_id: EAMQPClasses, method_id: number, args: Object) {
        const writer = new BufferWriter(AMQP.classes[class_id].METHOD_TEMPLATES[method_id]);
        const buf = writer.writeToBuffer(args);
        const frame = build_method_frame(channel, class_id, method_id, buf);

        this.sendFrame(frame);
    }

    public writeBuffer(buf: Buffer) {
        this.socket.write(buf);
    }

    private onTune = (args: ITuneArgs) => {
        this.emit('tune', args);
        this.heartbeat_service.rate = args.heartbeat;

        this.channelManager = new ChannelManager(args.channel_max);
    }

    protected onOpen = () => {
        this.connection_state = EConnState.open;
        this.emit('open');

        if (this.open_promise_resolve)
            this.open_promise_resolve();

        this.channel0.once('close', this.onClose);
        this.channel0.once('closeOk', this.onCloseOk);
    }

    public async close() {
        this.connection_state = EConnState.closing;

        await this.channelManager.closeAll();

        this.channel0.close();
        this.channel0.once('closeOk', this.onCloseOk);
    }

    protected onClose = () => {
        this.connection_state = EConnState.closing;

        this.onCloseOk();
    }

    protected onCloseOk = () => {
        this.socket.end();
        this.socket.destroy();

        this.emit('close');
    }

    public createChannel(channelNumber?: number): IChannel {
        return this.channelManager.createChannel(this, channelNumber);
    }
}
