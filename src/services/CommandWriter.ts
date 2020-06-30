import { Transform, TransformCallback } from 'stream';
import debugFn from 'debug';
const debug = debugFn('amqp:commandwriter');

import { ICommand } from '../interfaces/Protocol';

import encodeFrame from '../utils/FrameEncoder';
import encodeCommand from '../utils/CommandEncoder';

export default class CommandWriter extends Transform {
    private _frameMax: number;
    public buf: Buffer;

    public constructor(frameMax = 10000) {
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

    _transform(command: ICommand, _encoding: string, cb: TransformCallback): void {
        const gen = encodeCommand(command, this.frameMax);
        let already_finished = false;

        const transform = () => {
            if (already_finished) {
                debug('already_finished!');
                return;
            }

            let ok = true;
            let done: boolean | undefined = false;

            do {
                const next = gen.next();
                done = next.done;

                if (!done) {
                    ok = this.push(encodeFrame(next.value, this.frameMax, this.buf));
                }
            } while (ok && !done);

            if (done !== true) {
                debug('Not done yet!');
                this.once('drain', () => {
                    debug('drained!');
                    transform();
                });
                setImmediate(transform);
            } else {
                already_finished = true;
                cb();
            }
        };

        transform();
    }
}
