import { Transform, TransformCallback } from 'stream';
import * as AMQPBasic from '../protocol/basic';
import {
    ICommand,
    IMethod,
    EAMQPClasses,
    EFrameTypes
} from '../interfaces/Protocol';
import Method from '../frames/Method';
import ContentHeader from '../frames/ContentHeader';

export default class CommandWriter extends Transform {
    private _frame_max?: number;

    public constructor() {
        super({
            writableObjectMode: true,
            readableObjectMode: true
        });
    }

    public get frameMax(): number {
        return this._frame_max || 0;
    }

    public set frameMax(value: number) {
        this._frame_max = value;
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

    _transform(command: ICommand, encoding: string, cb: TransformCallback) {
        const method = new Method(
            command.method.class_id,
            command.method.method_id,
            command.method.args
        ).toIFrame(command.channel);

        if (this._hasContent(command.method) && command.header) {
            this.push(method);
            this.push(
                new ContentHeader(
                    command.method.class_id,
                    command.body ? BigInt(command.body.byteLength) : 0n,
                    command.header.properties
                ).toIFrame(command.channel)
            );

            if (command.body && command.body.byteLength > 0) {
                if (this.frameMax < 1)
                    return cb(new Error('Max frame size not negotiated!'));

                for (
                    let i = 0;
                    i < command.body.byteLength;
                    i += this.frameMax
                ) {
                    cb(undefined, {
                        type: EFrameTypes.FRAME_BODY,
                        channel: command.channel,
                        payload: command.body.slice(i, i + this.frameMax)
                    });
                }
            }
        }
        else {
            cb(undefined, method);
        }
    }
}
