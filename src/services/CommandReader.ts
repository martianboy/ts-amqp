import { Transform, TransformCallback } from 'stream';
import debugFn from 'debug';
const debug = debugFn('amqp:commandreader');

import { IFrame, ICommand, EFrameTypes, EAMQPClasses, IMethod } from '../interfaces/Protocol';
import * as AMQPBasic from '../protocol/basic';
import BufferWriter from '../utils/BufferWriter';
import FrameDecoder from '../utils/FrameDecoder';

export enum EReaderState {
    EXPECTING_METHOD,
    EXPECTING_HEADER,
    EXPECTING_BODY,
    READY
}

export default class CommandReader extends Transform {
    private _command?: ICommand;
    private _state: EReaderState = EReaderState.EXPECTING_METHOD;
    private _remaining_bytes = 0n;
    private _writer?: BufferWriter;
    private _decoder = new FrameDecoder();

    public constructor() {
        super({
            writableObjectMode: true,
            readableObjectMode: true
        });
    }

    public get state() {
        return this._state;
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

    private consumeMethodFrame(frame: IFrame) {
        if (frame.type !== EFrameTypes.FRAME_METHOD) {
            throw new Error(`Expected method, got ${frame.type} instead. Invalid frame type!`);
        }

        this._command = {
            channel: frame.channel,
            method: frame.method
        };

        debug(`read method frame ${frame.method.class_id}:${frame.method.method_id}`);

        this._state = this._hasContent(frame.method)
            ? EReaderState.EXPECTING_HEADER
            : EReaderState.READY;
    }

    private consumeHeaderFrame(frame: IFrame) {
        if (frame.type !== EFrameTypes.FRAME_HEADER) {
            throw new Error(`Expected header, got ${frame.type} instead. Invalid frame type!`);
        }

        if (!this._command) throw new Error('Unexpected frame!');

        this._command.header = frame.header;

        if (frame.header.body_size > 0) {
            this._command.body = Buffer.alloc(Number(frame.header.body_size));
            this._writer = new BufferWriter(this._command.body);

            this._remaining_bytes = frame.header.body_size;
            this._state = EReaderState.EXPECTING_BODY;
        } else {
            this._state = EReaderState.READY;
        }
    }

    private consumeBodyFrame(frame: IFrame) {
        if (frame.type !== EFrameTypes.FRAME_BODY) {
            throw new Error(`Expected body, got ${frame.type} instead. Invalid frame type!`);
        }

        if (!this._command || !this._writer) throw new Error('Unexpected frame!');

        this._writer.copyFrom(frame.payload);
        this._remaining_bytes -= BigInt(frame.payload.byteLength);

        this._state = this._remaining_bytes > 0 ? EReaderState.EXPECTING_BODY : EReaderState.READY;
    }

    processFrame(frame: IFrame) {
        switch (this._state) {
            case EReaderState.EXPECTING_METHOD:
                this.consumeMethodFrame(frame);
                break;
            case EReaderState.EXPECTING_HEADER:
                this.consumeHeaderFrame(frame);
                debug('read header frame...');
                break;
            case EReaderState.EXPECTING_BODY:
                this.consumeBodyFrame(frame);
                debug('read body frame...');
                break;
            default:
                debug('Unknown state');
                break;
        }

        if (this._state === EReaderState.READY) {
            this._state = EReaderState.EXPECTING_METHOD;
            this.push(this._command);
        }
    }

    _transform(chunk: Buffer, _encoding: string, cb: TransformCallback) {
        for (const frame of this._decoder.extract(chunk)) {
            if (frame.type === EFrameTypes.FRAME_HEARTBEAT) {
                this.emit('heartbeat');
                continue;
            }

            try {
                this.processFrame(frame);
            } catch (ex) {
                console.error(ex);
                return cb(ex);
            }
        }

        cb();
    }
}
