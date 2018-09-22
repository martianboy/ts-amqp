import { Transform, TransformCallback } from "stream";
import { read_frame, write_frame } from "../utils/Frame";
import { IFrame, EFrameTypes } from "../interfaces/Protocol";

export class FrameDecoder extends Transform {
    public constructor() {
        super({
            readableObjectMode: true
        });
    }

    _transform(chunk: Buffer, encoding: string, cb: TransformCallback) {
        const frame = read_frame(chunk);
        cb(undefined, frame);
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