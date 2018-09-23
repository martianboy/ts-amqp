import { Transform, TransformCallback } from "stream";
import { read_frame, write_frame, parse_frame_header } from "../utils/Frame";
import { IFrame, IFrameHeader } from "../interfaces/Protocol";
import BufferWriter from "../utils/BufferWriter";

export class FrameDecoder extends Transform {
    protected writer?: BufferWriter;

    public constructor() {
        super({
            readableObjectMode: true
        });
    }

    private try_read_frame(chunk: Buffer, cb: TransformCallback) {
        try {
            return read_frame(chunk);
        }
        catch (ex) {
            this.writer = undefined;
            return cb(ex);
        }    
    }

    _transform(chunk: Buffer, encoding: string, cb: TransformCallback) {
        if (this.writer === undefined) {
            const { payload_size } = parse_frame_header(chunk);
            const frame = this.try_read_frame(chunk, cb);

            if (!frame) {
                this.writer = new BufferWriter(Buffer.alloc(payload_size + 8));
                this.writer.copyFrom(chunk);
                cb();
            }
            else {
                cb(undefined, frame);
            }
        }
        else {
            this.writer.copyFrom(chunk);
            const frame = this.try_read_frame(this.writer.buffer, cb);

            if (!frame) {
                if (this.writer.buffer.length < this.writer.offset + chunk.length) {
                    cb(new Error('Malformed frame.'));
                    this.writer = undefined;
                }
                else {
                    this.writer.copyFrom(chunk);
                    cb();
                }
            }
            else {
                this.writer = undefined;
                cb(undefined, frame);
            }
        }
    }
}

export class FrameEncoder extends Transform {
    public constructor() {
        super({
            writableObjectMode: true
        });
    }

    _transform(chunk: IFrame, encoding: string, cb: TransformCallback) {
        const buf = write_frame(chunk);
        cb(undefined, buf);
    }
}