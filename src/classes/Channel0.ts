import debugFn from 'debug';
const debug = debugFn('ts-amqp');

import Channel, { EChanState } from './Channel';
import {
    IConnection,
    IConnectionParams,
    ITuneArgs,
    IConnectionStartArgs
} from '../interfaces/Connection';
import { ICloseReason, EAMQPClasses } from '../interfaces/Protocol';
import {
    CONNECTION_START,
    CONNECTION_START_OK,
    CONNECTION_TUNE,
    CONNECTION_TUNE_OK,
    CONNECTION_OPEN,
    CONNECTION_OPEN_OK,
    CONNECTION_CLOSE,
    CONNECTION_CLOSE_OK
} from '../protocol/connection';

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
        this.expectCommand<IConnectionStartArgs>(CONNECTION_START, this.startOk);
    }

    private expectCommand<T>(method_id: number, callback: (args: T) => void) {
        this.once(`method:${EAMQPClasses.CONNECTION}:${method_id}`, callback);
    }

    private startOk = (args: IConnectionStartArgs) => {
        this.sendCommand(EAMQPClasses.CONNECTION, CONNECTION_START_OK, {
            client_properties: {
                name: 'ts-amqp',
                version: '0.3.0',
                capabilities: {
                    'basic.nack': true,
                    per_consumer_qos: true,
                    consumer_cancel_notify: true
                }
            },
            mechanism: 'PLAIN',
            response: ['', this.params.username, this.params.password].join(String.fromCharCode(0)),
            locale: this.params.locale
        });

        this.expectCommand(CONNECTION_TUNE, this.onTune);
    };

    private onTune = (args: ITuneArgs) => {
        this.emit('tune', args);

        this.tuneOk(args);
        this.open(this.params.vhost);
    };

    private tuneOk = (args: ITuneArgs) => {
        this.sendCommand(EAMQPClasses.CONNECTION, CONNECTION_TUNE_OK, args);
    };

    private open = (virtualhost: string) => {
        this.write({
            class_id: EAMQPClasses.CONNECTION,
            method_id: CONNECTION_OPEN,
            args: {
                virtualhost,
                reserved1: '',
                reserved2: false
            }
        });

        this.expectCommand(CONNECTION_OPEN_OK, this.onOpenOk);
        this.expectCommand(CONNECTION_CLOSE, this.onClose);
    };

    private onOpenOk = () => {
        this._channelState = EChanState.open;

        this.emit('open');
    };

    public close() {
        const reason: ICloseReason = {
            reply_code: 200,
            reply_text: "Let's connect soon!",
            class_id: 0,
            method_id: 0
        };

        this.sendCommand(EAMQPClasses.CONNECTION, CONNECTION_CLOSE, reason);

        this._channelState = EChanState.closing;
        this.emit('closing', reason);
        this.expectCommand(CONNECTION_CLOSE_OK, this.onCloseOk);
    }

    public onClose = (reason: ICloseReason) => {
        debug('closing...');
        debug('Close Reason:', reason);

        this._channelState = EChanState.closing;
        this.emit('closing', reason);
        this.sendCommand(EAMQPClasses.CONNECTION, CONNECTION_CLOSE_OK, {});
        this.onCloseOk(reason);
    };

    private onCloseOk = (reason: ICloseReason) => {
        this._channelState = EChanState.closed;
        this.emit('channelClose', reason);
    };
}
