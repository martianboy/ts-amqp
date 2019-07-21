import { Transform, TransformCallback } from 'stream';
import { IFrame, EFrameTypes } from '../interfaces/Protocol';
import BufferWriter from '../utils/BufferWriter';
import BufferReader from '../utils/BufferReader';
import Frame from '../frames/Frame';
import Method from '../frames/Method';
import ContentHeader from '../frames/ContentHeader';

export default class FrameDecoder extends Transform {
    private writer?: BufferWriter;
    private frames: IFrame[] = [];

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

    private read_frame(buf: Buffer): IFrame {
        const reader = new BufferReader(buf);
        const frame = Frame.fromBuffer(reader);

        switch (frame.type) {
            case EFrameTypes.FRAME_METHOD:
                return {
                    type: frame.type,
                    channel: frame.channel,
                    method: Method.fromFrame(frame)
                };
            case EFrameTypes.FRAME_HEARTBEAT:
                return {
                    type: frame.type,
                    channel: frame.channel
                };
            case EFrameTypes.FRAME_HEADER:
                return {
                    type: frame.type,
                    channel: frame.channel,
                    header: ContentHeader.fromFrame(frame)
                };

            case EFrameTypes.FRAME_BODY:
                if (!Buffer.isBuffer(frame.payload))
                    throw new Error('Uninitialized frame payload!');

                return {
                    type: EFrameTypes.FRAME_BODY,
                    channel: frame.channel,
                    payload: frame.payload
                };

            default:
                throw new Error('Uknown frame type.');
        }
    }

    extractFrames(chunk: Buffer, frames: IFrame[] = []): void {
        if (this.writer === undefined) {
            if (chunk.byteLength < 7) {
                this.writer = new BufferWriter(chunk);
            } else {
                const { payload_size } = this.parse_frame_header(chunk);

                if (chunk.byteLength < payload_size + 8) {
                    this.writer = new BufferWriter(Buffer.alloc(payload_size + 8));
                    this.writer.copyFrom(chunk);
                } else {
                    const frame = this.read_frame(chunk.slice(0, payload_size + 8));
                    frames.push(frame);
                    return this.extractFrames(chunk.slice(payload_size + 8), frames);
                }
            }
        } else {
            if (this.writer.buffer.byteLength < 7) {
                const buf = Buffer.alloc(chunk.length + this.writer.buffer.length);

                this.writer.buffer.copy(buf, 0);
                chunk.copy(buf, this.writer.buffer.byteLength);

                this.writer = undefined;
                return this.extractFrames(buf, frames);
            } else {
                this.writer.copyFrom(chunk);

                if (!this.writer.remaining) {
                    const frame = this.read_frame(this.writer.buffer);
                    const byte_length = this.writer.buffer.byteLength;
                    this.writer = undefined;

                    frames.push(frame);
                    return this.extractFrames(chunk.slice(byte_length), frames);
                }
            }
        }
    }

    _transform(chunk: Buffer, encoding: string, cb: TransformCallback) {
        try {
            this.extractFrames(chunk, this.frames);

            if (this.frames.length > 0) {
                while (this.frames.length > 0) {
                    this.push(this.frames.shift());
                }
            }

            cb();
        } catch (ex) {
            return cb(ex);
        }
    }

    _flush(cb: TransformCallback) {
        if (this.frames.length > 0) {
            while (this.frames.length > 0) {
                this.push(this.frames.shift());
            }
        }

        cb();
    }
}
