import { connect } from 'net';
import * as AMQP from '../amqp';
import BufferReader from '../utils/BufferReader';
import { IFrame } from '../interfaces/Protocol';
import { IMethod } from '../interfaces/Method';
import { EventEmitter } from 'events';

export class Connection extends EventEmitter {
    public constructor() {
        super()
    }

    protected read_frame(buf: Buffer): IFrame {
        const reader = new BufferReader(buf);
        const frame = reader.readTableFromTemplate<IFrame>(AMQP.tplFrameHeader);

        if (frame.frame_end !== AMQP.FRAME_END) {
            throw new Error('Malformed frame end octet!');
        }

        switch (frame.type) {
            case 1:
                const payload = this.read_method_frame(frame.payload);
                frame.method = payload;
                break;
            default:
                throw new Error('Uknown frame type.')
        }

        return frame;
    }

    protected read_method_frame(buf: Buffer): IMethod {
        const reader = new BufferReader(buf)

        const class_id = reader.readUInt16BE();
        const method_id = reader.readUInt16BE();
        const args = reader.readTableFromTemplate(AMQP.classes[class_id].METHOD_TEMPLATES[method_id])

        return {
            class_id,
            method_id,
            args
        };
    }

    public start() {
        const socket = connect(AMQP.PORT)

        socket.on("connect", () => {
            socket.write(AMQP.PROTOCOL_HEADER);
        })

        socket.on("data", (buf: Buffer) => {
            const frame = this.read_frame(buf)

            console.log(frame)

            socket.end()
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

    public shutdown() {

    }
}