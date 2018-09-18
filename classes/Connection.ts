import { connect, Socket } from 'net';
import * as AMQP from '../amqp';
import { EventEmitter } from 'events';
import BufferWriter from '../utils/BufferWriter';
import {
    read_frame,
    write_method_frame
} from '../utils/Frame';

enum EConnState {
    closed = 0,
    handshake = 1,
    open = 2
};

export class Connection extends EventEmitter {
    protected socket: Socket;
    protected heartbeat_rate: number;
    protected connection_state: EConnState = EConnState.closed;

    public constructor() {
        super()
    }

    public start() {
        const socket = this.socket = connect(AMQP.PORT)

        this.on('method:10:10', this.startOk.bind(this))
        this.on('method:10:30', req => {
            this.tuneOk(req)
            this.open({
                virtualhost: '/',
                capabilities: '',
                insist: false
            })
            this.send_heartbeat();
        })
        this.on('method:10:41', () => {
            this.connection_state = EConnState.open;
        })

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
            }
        })

        socket.on("close", (had_error: boolean) => {
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

    public startOk(req) {
        const args = {
            client_properties: {
                name: 'ts-amqp',
                version: '0.0.1'
            },
            mechanism: 'PLAIN',
            response: ['', 'guest', 'guest'].join(String.fromCharCode(0)),
            locale: 'en_US'
        }

        const writer = new BufferWriter(AMQP.classes[10].METHOD_TEMPLATES[11])
        const buf = writer.writeToBuffer(args)
        const frame = write_method_frame(10, 11, buf)

        this.socket.write(frame)
    }

    public tuneOk(req) {
        this.heartbeat_rate = req.heartbeat;

        const writer = new BufferWriter(AMQP.classes[10].METHOD_TEMPLATES[31]);
        const buf = writer.writeToBuffer(req);
        const frame = write_method_frame(10, 31, buf);

        this.socket.write(frame);
    }

    public open(req) {
        const writer = new BufferWriter(AMQP.classes[10].METHOD_TEMPLATES[40]);
        const buf = writer.writeToBuffer(req);
        const frame = write_method_frame(10, 40, buf);

        this.socket.write(frame);
    }

    public send_heartbeat() {
        console.log('sending heartbeat...');
        this.socket.write(AMQP.HEARTBEAT_BUF);

        if (this.connection_state !== EConnState.closed) {
            setTimeout(() => this.send_heartbeat(), this.heartbeat_rate * 1000);
        }
    }

    public closeOk() {
        this.socket.end();
    }
}