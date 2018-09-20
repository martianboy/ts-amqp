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
    DEFALT_CONNECTION_PARAMS
} from '../interfaces/Connection';

import HeartbeatService from '../services/Heartbeat';
import { IFrame } from '../interfaces/Protocol';
import Channel0 from './Channel0';

export default class Connection extends EventEmitter implements IConnection {
    protected socket: Socket;
    protected connection_state: EConnState = EConnState.closed;
    protected params: IConnectionParams;

    protected heartbeat_service: HeartbeatService;
    protected channel0: Channel0;

    protected connection_attempts: number = 0;

    public constructor(params: Partial<IConnectionParams> = DEFALT_CONNECTION_PARAMS) {
        super();

        const param_or_default = (k: string) => params.hasOwnProperty(k) ? params[k] : DEFALT_CONNECTION_PARAMS[k];

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

    protected onSockError = (err) => {
        switch (err.code) {
            case 'ECONNREFUSED':
                if (this.connection_attempts < this.params.maxRetries) {
                    setTimeout(() => {
                        this.cleanup();
                        this.start();
                    }, this.params.retryDelay);
                }

                break;
            default:
                console.error(err);
        }
    }

    protected onSockTimeout = () => {
        this.emit('timeout');

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

    public start() {
        this.connection_attempts++;

        this.socket = connect({
            host: this.params.host,
            port: this.params.port
        });

        this.attachSocketEventHandlers();
    }

    public sendFrame(frame: IFrame) {
        const buf = write_frame(frame);
        this.socket.write(buf);
    }

    public sendMethod(channel: number, class_id: number, method_id: number, args: Object) {
        const writer = new BufferWriter(AMQP.classes[class_id].METHOD_TEMPLATES[method_id]);
        const buf = writer.writeToBuffer(args);
        const frame = build_method_frame(channel, class_id, method_id, buf);

        this.sendFrame(frame);
    }

    public writeBuffer(buf: Buffer) {
        this.socket.write(buf);
    }

    private onTune = (req) => {
        this.emit('tune', req);
        this.heartbeat_service.rate = req.heartbeat;
    }

    protected onOpen = () => {
        this.connection_state = EConnState.open;
        this.emit('open');

        this.channel0.once('close', this.onClose);
        this.channel0.once('closeOk', this.onCloseOk);
    }

    public close() {
        this.connection_state = EConnState.closing;

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
}
