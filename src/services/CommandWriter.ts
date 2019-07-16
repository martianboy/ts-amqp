import { Transform, TransformCallback } from 'stream';
import debugFn from 'debug';
const debug = debugFn('ts-amqp');

import * as AMQP from '../protocol';
import * as AMQPBasic from '../protocol/basic';
import {
    ICommand,
    IMethod,
    EAMQPClasses,
    EFrameTypes,
    IFrame
} from '../interfaces/Protocol';

import Method from '../frames/Method';
import ContentHeader from '../frames/ContentHeader';
import Frame from '../frames/Frame';

import BufferWriter from '../utils/BufferWriter';

export default class CommandWriter extends Transform {
    private _frameMax: number;
    public buf: Buffer;

    public constructor(frameMax: number = 10000) {
        super({
            writableObjectMode: true
        });

        this._frameMax = frameMax;
        this.buf = Buffer.alloc(frameMax);
    }

    public get frameMax(): number {
        return this._frameMax || 0;
    }

    public set frameMax(value: number) {
        this._frameMax = value;
        this.buf = Buffer.alloc(value);
    }

    private _hasContent(method: IMethod) {
        return (
            method.class_id === EAMQPClasses.BASIC &&
            [
                AMQPBasic.BASIC_PUBLISH,
                AMQPBasic.BASIC_RETURN,
                AMQPBasic.BASIC_DELIVER,
                AMQPBasic.BASIC_GET_OK
            ].includes(method.method_id)
        );
    }

    *toFrames(command: ICommand): IterableIterator<IFrame> {
        const method = new Method(
            command.method.class_id,
            command.method.method_id,
            command.method.args
        ).toIFrame(command.channel);

        yield method;

        if (this._hasContent(command.method) && command.header) {
            yield new ContentHeader(
                command.method.class_id,
                command.body ? BigInt(command.body.byteLength) : 0n,
                command.header.properties
            ).toIFrame(command.channel);

            if (command.body && command.body.byteLength > 0) {
                if (this.frameMax < 1)
                    throw new Error('Max frame size not negotiated!');

                for (
                    let i = 0;
                    i < command.body.byteLength;
                    i += this.frameMax
                ) {
                    yield {
                        type: EFrameTypes.FRAME_BODY,
                        channel: command.channel,
                        payload: command.body.slice(i, i + this.frameMax)
                    };
                }
            }
        }
    }

    toBuffer(frame: IFrame) {
        if (this._frameMax === undefined) {
            throw new Error('Max frame size is not specified.');
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
                )
                    .toFrame(frame.channel)
                    .writeToBuffer(writer);

                break;

            case EFrameTypes.FRAME_HEADER:
                debug('encoding header frame...');

                new ContentHeader(
                    frame.header.class_id,
                    frame.header.body_size,
                    frame.header.properties
                )
                    .toFrame(frame.channel)
                    .writeToBuffer(writer);

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
                throw new Error('Unknown frame type.');
        }

        return writer.slice();
    }

    _transform(command: ICommand, _encoding: string, cb: TransformCallback) {
        for (const frame of this.toFrames(command)) {
            this.push(this.toBuffer(frame), 'buffer');
        }

        cb();
    }
}
