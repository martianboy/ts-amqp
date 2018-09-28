import * as AMQP from '../amqp';
import { Transform, TransformCallback } from 'stream';
import { IFrame, EFrameTypes } from '../interfaces/Protocol';
import BufferWriter from '../utils/BufferWriter';

export default class FrameEncoder extends Transform {
    public _frameMax: number;
    public buf: Buffer;

    public constructor(frameMax: number = 10000) {
        super({
            writableObjectMode: true
        });

        this._frameMax = frameMax;
        this.buf = Buffer.alloc(frameMax);
    }

    public get frameMax() {
        return this._frameMax;
    }

    public set frameMax(value: number) {
        this._frameMax = value;
        this.buf = Buffer.alloc(value);
    }

    _transform(frame: IFrame, encoding: string, cb: TransformCallback) {
        if (this._frameMax === undefined) {
            return cb(new Error('Max frame size is not specified.'));
        }

        const writer = new BufferWriter(this.buf);

        writer.writeUInt8(frame.type);
        writer.writeUInt16BE(frame.channel);

        switch (frame.type) {
            case EFrameTypes.FRAME_HEARTBEAT:
                writer.writeUInt32BE(0);
                break;

            case EFrameTypes.FRAME_METHOD:
                const method = frame.method;
                const tpl =
                    AMQP.classes[method.class_id].METHOD_TEMPLATES[
                        method.method_id
                    ];

                writer.writeUInt32BE(0); // frame.payload_size; We'll come back here later
                writer.writeUInt16BE(method.class_id);
                writer.writeUInt16BE(method.method_id);
                writer.writeToBuffer(tpl, method.args);

                this.buf.writeUInt32BE(writer.offset - 7, 3); // frame.payload_size

                break;

            default:
                throw new Error('Uknown frame type.');
        }

        writer.writeUInt8(AMQP.FRAME_END);

        cb(undefined, writer.slice());
    }
}
