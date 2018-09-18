import * as AMQP from '../amqp';
import { IFrame } from "../interfaces/Protocol";
import { IMethod } from '../interfaces/Method';
import BufferReader from "./BufferReader";
import BufferWriter from './BufferWriter';

export function read_frame(buf: Buffer): IFrame {
    const reader = new BufferReader(buf);
    const frame = reader.readTableFromTemplate<IFrame>(AMQP.tplFrameHeader);

    if (frame.frame_end !== AMQP.FRAME_END) {
        throw new Error('Malformed frame end octet!');
    }

    switch (frame.type) {
        case AMQP.FRAME_METHOD:
            const payload = this.read_method_frame(frame.payload);
            frame.method = payload;

            break;
        case AMQP.FRAME_HEARTBEAT:
            console.log('server heartbeat...');
            break;
        default:
            throw new Error('Uknown frame type.')
    }

    return frame;
}

export function read_method_frame(buf: Buffer): IMethod {
    const reader = new BufferReader(buf)

    const class_id = reader.readUInt16BE();
    const method_id = reader.readUInt16BE();

    console.log(`${class_id}:${method_id}`)
    const args = reader.readTableFromTemplate(AMQP.classes[class_id].METHOD_TEMPLATES[method_id])

    const method = {
        class_id,
        method_id,
        args
    };

    console.log(JSON.stringify(args, null, 2));

    return method;
}

export function write_method_frame(class_id: number, method_id: number, args: Buffer): Buffer {
    const writer = new BufferWriter({
        class_id: 'u',
        method_id: 'u',
        args: 'x'
    })

    const payload = writer.writeToBuffer({
        class_id,
        method_id,
        args
    })

    const payload_size = Buffer.alloc(4)
    payload_size.writeUInt32BE(payload.length, 0)

    const frame: IFrame = {
        type: 1,
        channel: 0,
        payload: Buffer.concat([payload_size, payload], 4 + payload.length),
        frame_end: AMQP.FRAME_END,
    }

    return this.write_frame(frame)
}

export function write_frame(frame: IFrame): Buffer {
    const writer = new BufferWriter(AMQP.tplFrameHeader)
    return writer.writeToBuffer(frame)
}
