import * as AMQP from '../amqp';

import Channel from "./Channel";
import { IConnection, IConnectionParams, ITuneArgs, IOpenArgs } from "../interfaces/Connection";

const CONNECTION_CLASS = 10;

const CONNECTION_START = 10;
const CONNECTION_START_OK = 11;
const CONNECTION_TUNE = 30;
const CONNECTION_TUNE_OK = 31;
const CONNECTION_OPEN = 40;
const CONNECTION_OPEN_OK = 41;
const CONNECTION_CLOSE = 50;
const CONNECTION_CLOSE_OK = 51;

/**
 * A special Channel responsible for handshake and close flows.
 */
export default class Channel0 extends Channel {
    private params: IConnectionParams;

    public constructor(connection: IConnection) {
        super(connection, 0);

        this.params = this.connection.connectionParameters;
    }

    public start() {
        this.connection.writeBuffer(Buffer.from(AMQP.PROTOCOL_HEADER));
        this.expectCommand(CONNECTION_START, this.startOk);
    }

    private expectCommand(method_id: number, callback: (...args: any[]) => void) {
        this.once(`method:${CONNECTION_CLASS}:${method_id}`, callback);
    }

    private startOk = () => {
        this.sendMethod(CONNECTION_CLASS, CONNECTION_START_OK, {
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

        this.expectCommand(CONNECTION_TUNE, this.onTune);
    }

    private onTune = (args: ITuneArgs) => {
        this.emit('tune', args);

        this.tuneOk(args);
        this.open({
            virtualhost: this.params.vhost,
            capabilities: '',
            insist: false
        });
    }

    private tuneOk = (args: ITuneArgs) => {
        this.sendMethod(CONNECTION_CLASS, CONNECTION_TUNE_OK, args);
    }

    private open = (args: IOpenArgs) => {
        this.sendMethod(CONNECTION_CLASS, CONNECTION_OPEN, args);

        this.expectCommand(CONNECTION_OPEN_OK, this.onOpenOk);
        this.expectCommand(CONNECTION_CLOSE, this.onClose);
    }

    private onOpenOk = () => {
        this.emit('open');
    }

    public close() {
        this.sendMethod(CONNECTION_CLASS, CONNECTION_CLOSE, {
            reply_code: 200,
            reply_text: 'Let\'s connect soon!',
            class_id: 0,
            method_id: 0
        });

        this.expectCommand(CONNECTION_CLOSE_OK, this.onCloseOk);
        this.emit('close');
    }

    public onClose = () => {
        this.sendMethod(CONNECTION_CLASS, CONNECTION_CLOSE_OK, {});
        this.onCloseOk();
    }

    private onCloseOk = () => {
        this.emit('closeOk');
    }
}