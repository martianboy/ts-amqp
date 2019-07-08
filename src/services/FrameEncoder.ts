import debugFn from 'debug';
const debug = debugFn('ts-amqp');

import * as AMQP from '../protocol';
import { Transform, TransformCallback } from 'stream';
import { IFrame, EFrameTypes } from '../interfaces/Protocol';
import BufferWriter from '../utils/BufferWriter';
import Method from '../frames/Method';
import ContentHeader from '../frames/ContentHeader';
import Frame from '../frames/Frame';

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

        switch (frame.type) {
            case EFrameTypes.FRAME_HEARTBEAT:
                writer.writeUInt8(frame.type);
                writer.writeUInt16BE(frame.channel);
                writer.writeUInt32BE(0);
                writer.writeUInt8(AMQP.FRAME_END);

                break;

            case EFrameTypes.FRAME_METHOD:
                debug('encoding message frame...');

                new Method(
                    frame.method.class_id,
                    frame.method.method_id,
                    frame.method.args
                ).toFrame(frame.channel).writeToBuffer(writer);

                break;

            case EFrameTypes.FRAME_HEADER:
                debug('encoding header frame...');

                new ContentHeader(
                    frame.header.class_id,
                    frame.header.body_size,
                    frame.header.properties
                ).toFrame(frame.channel).writeToBuffer(writer);

                break;

            case EFrameTypes.FRAME_BODY:
                debug('encoding body frame...');

                new Frame(
                    EFrameTypes.FRAME_BODY,
                    frame.channel,
                    frame.payload
                ).writeToBuffer(writer);

                break;

            default:
                return cb(new Error('Unknown frame type.'));
        }

        cb(undefined, writer.slice());
    }
}
