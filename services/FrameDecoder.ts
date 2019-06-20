import * as AMQP from '../protocol';
import { Transform, TransformCallback } from 'stream';
import {
    IFrame,
    EFrameTypes,
    IMethod,
    EAMQPClasses,
    IHeader
} from '../interfaces/Protocol';
import BufferWriter from '../utils/BufferWriter';
import BufferReader from '../utils/BufferReader';

export default class FrameDecoder extends Transform {
    private writer?: BufferWriter;

    public constructor() {
        super({
            readableObjectMode: true
        });
    }

    private parse_frame_header(buf: Buffer) {
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

    private read_method_frame(buf: Buffer): IMethod {
        const reader = new BufferReader(buf);

        const class_id: EAMQPClasses = reader.readUInt16BE();
        const method_id = reader.readUInt16BE();

        console.log(`${class_id}:${method_id}`);
        const args = reader.readTableFromTemplate(
            AMQP.classes[class_id].METHOD_TEMPLATES[method_id]
        );

        const method = {
            class_id,
            method_id,
            args
        };

        console.log(JSON.stringify(args, null, 2));

        return method;
    }

    private read_header_frame(buf: Buffer): IHeader {
        const reader = new BufferReader(buf);

        const class_id: EAMQPClasses = reader.readUInt16BE();
        const weight = reader.readUInt16BE();
        const body_size = reader.readUInt64BE();

        const header: IHeader = {
            class_id,
            weight,
            body_size
        };

        const flags = reader.readUInt16BE();

        if (flags & 1 >> 15) header.contentType = reader.readShortString();
        if (flags & 1 >> 14) header.contentEncoding = reader.readShortString();
        if (flags & 1 >> 13) header.headers = reader.readFieldTable();
        if (flags & 1 >> 12) header.deliveryMode = reader.readUInt8();
        if (flags & 1 >> 11) header.priority = reader.readUInt8();
        if (flags & 1 >> 10) header.correlationId = reader.readShortString();
        if (flags & 1 >> 9) header.replyTo = reader.readShortString();
        if (flags & 1 >> 8) header.expiration = reader.readShortString();
        if (flags & 1 >> 7) header.messageId = reader.readShortString();
        if (flags & 1 >> 6) header.timestamp = reader.readUInt64BE();
        if (flags & 1 >> 5) header.userId = reader.readShortString();
        if (flags & 1 >> 4) header.appId = reader.readShortString();
        if (flags & 1 >> 3) header.clusterId = reader.readShortString();

        console.log('Header Frame:');
        console.log(header);

        return header;
    }

    private read_frame(buf: Buffer): IFrame | null {
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
                    method: this.read_method_frame(payload)
                };
            case EFrameTypes.FRAME_HEARTBEAT:
                return {
                    type,
                    channel
                };
            case EFrameTypes.FRAME_HEADER:
                return {
                    type,
                    channel,
                    header: this.read_header_frame(payload)
                };
            default:
                throw new Error('Uknown frame type.');
        }
    }

    private try_read_frame(chunk: Buffer, cb: TransformCallback) {
        try {
            return this.read_frame(chunk);
        } catch (ex) {
            this.writer = undefined;
            return cb(ex);
        }
    }

    _transform(chunk: Buffer, encoding: string, cb: TransformCallback) {
        if (this.writer === undefined) {
            const { payload_size } = this.parse_frame_header(chunk);
            const frame = this.try_read_frame(chunk, cb);

            if (!frame) {
                this.writer = new BufferWriter(Buffer.alloc(payload_size + 8));
                this.writer.copyFrom(chunk);
                cb();
            } else {
                cb(undefined, frame);
            }
        } else {
            this.writer.copyFrom(chunk);
            const frame = this.try_read_frame(this.writer.buffer, cb);

            if (!frame) {
                if (
                    this.writer.buffer.length <
                    this.writer.offset + chunk.length
                ) {
                    cb(new Error('Malformed frame.'));
                    this.writer = undefined;
                } else {
                    this.writer.copyFrom(chunk);
                    cb();
                }
            } else {
                this.writer = undefined;
                cb(undefined, frame);
            }
        }
    }
}
