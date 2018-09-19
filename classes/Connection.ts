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

export class Connection extends EventEmitter implements IConnection {
    protected socket: Socket;
    protected connection_state: EConnState = EConnState.closed;
    protected heartbeat_service: HeartbeatService;
    protected params: IConnectionParams;

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
    }

    public get state(): EConnState {
        return this.connection_state;
    }

    protected attachHandshakeFlowHandlers() {
        this.once('method:10:10', this.startOk.bind(this));
        this.once('method:10:30', this.onTune.bind(this));
        this.once('method:10:41', this.onOpenOk.bind(this));
        this.once('method:10:50', this.onClose.bind(this));
        this.once('method:10:51', this.onCloseOk.bind(this));
    }

    protected attachSocketEventHandlers() {
        this.socket.on("connect", this.onSockConnect);
        this.socket.on("data", this.onSockData);
        this.socket.on("close", this.onSockClose);
        this.socket.on("error", this.onSockError);
        this.socket.on('timeout', this.onSockError);
    }

    protected detachSocketEventHandlers() {
        this.socket.off("connect", this.onSockConnect);
        this.socket.off("data", this.onSockData);
        this.socket.off("close", this.onSockClose);
        this.socket.off("error", this.onSockError);
        this.socket.off('timeout', this.onSockError);
    }

    protected onSockConnect = () => {
        this.socket.setKeepAlive(this.params.keepAlive, this.params.keepAliveDelay);
        this.socket.setTimeout(this.params.timeout);

        this.attachHandshakeFlowHandlers();

        this.socket.write(AMQP.PROTOCOL_HEADER);
        this.connection_state = EConnState.handshake;
    }

    protected onSockData = (buf: Buffer) => {
        const frame = read_frame(buf);

        this.emit('frame', frame);

        switch (frame.type) {
            case AMQP.FRAME_METHOD:
                this.emit('method', frame.method);
                this.emit(`method:${frame.method.class_id}:${frame.method.method_id}`, frame.method.args);
                break;
        }
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

    public sendMethod(class_id: number, method_id: number, args: Object) {
        const writer = new BufferWriter(AMQP.classes[class_id].METHOD_TEMPLATES[method_id]);
        const buf = writer.writeToBuffer(args);
        const frame = build_method_frame(0, class_id, method_id, buf);

        this.sendFrame(frame);
    }

    protected startOk() {
        this.sendMethod(10, 11, {
            client_properties: {
                name: 'ts-amqp',
                version: '0.0.1'
            },
            mechanism: 'PLAIN',
            response: [
                '',
                this.params.username,
                this.params.password
            ].join(String.fromCharCode(0)),
            locale: this.params.locale
        });
    }

    protected onTune(req) {
        this.emit('tune', req);

        this.tuneOk(req);
        this.open({
            virtualhost: this.params.vhost,
            capabilities: '',
            insist: false
        });
    }

    public tuneOk(req) {
        this.heartbeat_service.rate = req.heartbeat;

        this.sendMethod(10, 31, req);
    }

    public open(req) {
        this.sendMethod(10, 40, req);
    }

    protected onOpenOk() {
        this.connection_state = EConnState.open;
        this.emit('open-ok');
    }

    public close() {
        this.connection_state = EConnState.closing;

        this.sendMethod(10, 50, {
            reply_code: 200,
            reply_text: 'Let\'s connect soon!',
            class_id: 0,
            method_id: 0
        });
    }

    protected onClose() {
        this.connection_state = EConnState.closing;

        this.sendMethod(10, 51, {});
        this.onCloseOk();
    }

    protected onCloseOk() {
        this.emit('close');

        this.socket.end();
        this.socket.destroy();
    }
}
