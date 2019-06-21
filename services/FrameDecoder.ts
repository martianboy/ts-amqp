import { Transform, TransformCallback } from 'stream';
import {
    IFrame,
    EFrameTypes
} from '../interfaces/Protocol';
import BufferWriter from '../utils/BufferWriter';
import BufferReader from '../utils/BufferReader';
import Frame from '../frames/Frame';
import Method from '../frames/Method';
import ContentHeader from '../frames/ContentHeader';

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

    private read_frame(buf: Buffer): IFrame | null {
        const reader = new BufferReader(buf);
        const frame = Frame.fromBuffer(reader);

        switch (frame.type) {
            case EFrameTypes.FRAME_METHOD:
                const method = Method.fromFrame(frame);

                return {
                    type: frame.type,
                    channel: frame.channel,
                    method: {
                        method_id: method.method_id,
                        class_id: method.class_id,
                        args: method.args
                    }
                };
            case EFrameTypes.FRAME_HEARTBEAT:
                return {
                    type: frame.type,
                    channel: frame.channel
                };
            case EFrameTypes.FRAME_HEADER:
                const header = ContentHeader.fromFrame(frame);

                return {
                    type: frame.type,
                    channel: frame.channel,
                    header: {
                        class_id: header.class_id,
                        body_size: header.body_size,
                        properties: header.properties
                    }
                };

            case EFrameTypes.FRAME_BODY:
                return {
                    type: EFrameTypes.FRAME_BODY,
                    channel: frame.channel,
                    payload: frame.payload!
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
