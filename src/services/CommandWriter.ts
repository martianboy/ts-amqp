import { Transform, TransformCallback } from 'stream';
import debugFn from 'debug';
const debug = debugFn('amqp:commandwriter');

import { ICommand } from '../interfaces/Protocol';

import encodeFrame from '../utils/FrameEncoder';
import encodeCommand from '../utils/CommandEncoder';

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
        return this._frameMax;
    }

    public set frameMax(value: number) {
        this._frameMax = value;
        this.buf = Buffer.alloc(value);
    }

    _transform(command: ICommand, _encoding: string, cb: TransformCallback) {
        for (const frame of encodeCommand(command, this.frameMax)) {
            this.push(encodeFrame(frame, this.frameMax, this.buf), 'buffer');
        }

        cb();
    }
}
