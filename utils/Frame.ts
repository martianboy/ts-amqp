import * as AMQP from '../amqp';
import { IMethod, IFrame, EAMQPClasses, EFrameTypes } from "../interfaces/Protocol";
import BufferReader from "./BufferReader";
import BufferWriter from './BufferWriter';

export function parse_frame_header(buf: Buffer) {
    const reader = new BufferReader(buf);

    const type: EFrameTypes = reader.readUInt8();
    const channel = reader.readUInt16BE();
    const payload_size = reader.readUInt32BE();

    return {
        type,
        channel,
        payload_size
    };
}

export function read_frame(buf: Buffer): IFrame | null {
    const reader = new BufferReader(buf);

    const type: EFrameTypes = reader.readUInt8();
    const channel = reader.readUInt16BE();
    const payload_size = reader.readUInt32BE();

    if (buf.length < payload_size + 8) {
        return null;
    }

    const payload = reader.slice(payload_size);
    const frame_end = reader.readUInt8();

    if (frame_end !== AMQP.FRAME_END) {
        throw new Error('Malformed frame end octet!');
    }

    switch (type) {
        case EFrameTypes.FRAME_METHOD:
            return {
                type,
                channel,
                method: read_method_frame(payload)
            };
        case EFrameTypes.FRAME_HEARTBEAT:
            return {
                type,
                channel
            };
        default:
            throw new Error('Uknown frame type.');
    }
}

export function read_method_frame(buf: Buffer): IMethod {
    const reader = new BufferReader(buf);

    const class_id: EAMQPClasses = reader.readUInt16BE();
    const method_id = reader.readUInt16BE();

    console.log(`${class_id}:${method_id}`);
    const args = reader.readTableFromTemplate(AMQP.classes[class_id].METHOD_TEMPLATES[method_id]);

    const method = {
        class_id,
        method_id,
        args
    };

    console.log(JSON.stringify(args, null, 2));

    return method;
}

export function write_frame(frame: IFrame): Buffer {
    const frame_max = 131072;
    const buf = Buffer.alloc(frame_max);
    const writer = new BufferWriter(buf);

    writer.writeUInt8(frame.type);
    writer.writeUInt16BE(frame.channel);

    switch (frame.type) {
        case EFrameTypes.FRAME_HEARTBEAT:
            writer.writeUInt32BE(0);
            break;

        case EFrameTypes.FRAME_METHOD:
            const method = frame.method;
            const tpl = AMQP
                .classes[method.class_id]
                .METHOD_TEMPLATES[method.method_id];

            writer.writeUInt32BE(0);        // frame.payload_size; We'll come back here later
            writer.writeUInt16BE(method.class_id);
            writer.writeUInt16BE(method.method_id);
            writer.writeToBuffer(tpl, method.args);

            buf.writeUInt32BE(writer.offset - 7, 3);    // frame.payload_size

            break;

        default:
            throw new Error('Uknown frame type.');
    }

    writer.writeUInt8(AMQP.FRAME_END);

    return writer.slice();
}
