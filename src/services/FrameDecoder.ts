import debugFn from 'debug';
const debug = debugFn('amqp:decoder');

import { IFrame, EFrameTypes } from '../interfaces/Protocol';
import BufferWriter from '../utils/BufferWriter';
import BufferReader from '../utils/BufferReader';
import Frame from '../frames/Frame';
import Method from '../frames/Method';
import ContentHeader from '../frames/ContentHeader';

export default class FrameDecoder {
    private writer?: BufferWriter;

    private parseFrameHeader(buf: Buffer) {
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

    private readFrame(buf: Buffer): IFrame {
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

    *extract(chunk: Buffer): IterableIterator<IFrame> {
        if (this.writer === undefined) {
            if (chunk.byteLength < 7) {
                this.writer = new BufferWriter(chunk);
            } else {
                const { payload_size } = this.parseFrameHeader(chunk);

                if (chunk.byteLength < payload_size + 8) {
                    this.writer = new BufferWriter(Buffer.alloc(payload_size + 8));
                    this.writer.copyFrom(chunk);
                } else {
                    const frame = this.readFrame(chunk.slice(0, payload_size + 8));
                    yield frame;
                    yield* this.extract(chunk.slice(payload_size + 8));
                }
            }
        } else {
            if (this.writer.buffer.byteLength < 7) {
                const buf = Buffer.alloc(chunk.length + this.writer.buffer.length);

                this.writer.buffer.copy(buf, 0);
                chunk.copy(buf, this.writer.buffer.byteLength);

                this.writer = undefined;
                yield* this.extract(buf);
            } else {
                const bytes_read = this.writer.copyFrom(chunk);

                if (!this.writer.remaining) {
                    const frame = this.readFrame(this.writer.buffer);
                    this.writer = undefined;

                    yield frame;
                    yield* this.extract(chunk.slice(bytes_read));
                }
            }
        }
    }
}
