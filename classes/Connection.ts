import { connect, Socket } from 'net';
import * as AMQP from '../amqp';
import { EventEmitter } from 'events';
import BufferWriter from '../utils/BufferWriter';
import {
    read_frame,
    write_method_frame
} from '../utils/Frame';

enum EConnState {
    closing = -1,
    closed = 0,
    handshake = 1,
    open = 2
};

export class Connection extends EventEmitter {
    protected socket: Socket;
    protected heartbeat_rate: number;
    protected connection_state: EConnState = EConnState.closed;
    protected heartbeat_timeout: NodeJS.Timer;

    public start() {
        const socket = this.socket = connect(AMQP.PORT)

        this.on('method:10:10', this.startOk.bind(this))
        this.on('method:10:30', this.onTune.bind(this))
        this.on('method:10:41', this.onOpenOk.bind(this))
        this.on('method:10:51', this.onCloseOk.bind(this))

        socket.on("connect", () => {
            socket.write(AMQP.PROTOCOL_HEADER);
            this.connection_state = EConnState.handshake;
        })

        socket.on("data", (buf: Buffer) => {
            const frame = read_frame(buf)

            switch (frame.type) {
                case AMQP.FRAME_METHOD:
                    this.emit('method', frame.method)
                    this.emit(`method:${frame.method.class_id}:${frame.method.method_id}`, frame.method.args)
                    break;
                case AMQP.FRAME_HEARTBEAT:
                    console.log('server heartbeat...');
                    break;
            }
        });

        socket.on("close", (had_error: boolean) => {
            this.connection_state = EConnState.closed;
            clearTimeout(this.heartbeat_timeout)

            if (had_error) {
                console.log('Close: An error occured.')
            }
            else {
                console.log('Close: connection closed successfully.')
            }
        })

        socket.on("error", (err) => {
            console.error(err)
        })

        socket.on("timeout", () => {
            console.log("Timeout while connecting to the server.")
        })

        socket.on("end", () => {
            console.log("Socket ended.")
        })
    }

    public sendMethod(class_id: number, method_id: number, args: Object) {
        const writer = new BufferWriter(AMQP.classes[class_id].METHOD_TEMPLATES[method_id])
        const buf = writer.writeToBuffer(args)
        const frame = write_method_frame(class_id, method_id, buf)

        this.socket.write(frame)
    }

    public startOk() {
        this.sendMethod(10, 11, {
            client_properties: {
                name: 'ts-amqp',
                version: '0.0.1'
            },
            mechanism: 'PLAIN',
            response: ['', 'guest', 'guest'].join(String.fromCharCode(0)),
            locale: 'en_US'
        });
    }

    protected onTune(req) {
        this.tuneOk(req)
        this.open({
            virtualhost: '/',
            capabilities: '',
            insist: false
        })
        this.heartbeat();
    }

    public tuneOk(req) {
        this.heartbeat_rate = req.heartbeat;

        this.sendMethod(10, 31, req)
    }

    public open(req) {
        this.sendMethod(10, 40, req)
    }

    protected onOpenOk() {
        this.connection_state = EConnState.open;
    }

    public heartbeat() {
        if (this.connection_state !== EConnState.closed) {
            console.log('sending heartbeat...');
            this.socket.write(AMQP.HEARTBEAT_BUF);

            this.heartbeat_timeout = setTimeout(() => this.heartbeat(), this.heartbeat_rate * 1000);
        }
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
        this.sendMethod(10, 51, {});
    }

    protected onCloseOk() {
        this.socket.end();
        this.socket.destroy();
    }
}