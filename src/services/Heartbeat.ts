import debugFn from 'debug';
const debug = debugFn('amqp:heartbeat');

import * as AMQP from '../protocol';
import { Readable } from 'stream';

const HEARTBEAT_FRAME: Buffer = Buffer.from([
    AMQP.FRAME_HEARTBEAT,
    0,
    0,
    0,
    0,
    0,
    0,
    AMQP.FRAME_END
]);

export default class HeartbeatService extends Readable {
    protected heartbeat_rate: number = 0;
    protected heartbeat_interval: NodeJS.Timer | null = null;

    public get rate(): number {
        return this.heartbeat_rate;
    }

    public set rate(seconds: number) {
        this.stop();

        if (seconds > 0) {
            this.heartbeat_rate = seconds;
            this.heartbeat_interval = setInterval(() => this.beat(), this.heartbeat_rate * 1000);
            this.beat();
        }
    }

    private beat() {
        debug('sending heartbeat...');
        this.push(HEARTBEAT_FRAME);
    }

    private stop() {
        if (this.heartbeat_interval) {
            clearInterval(this.heartbeat_interval);
            this.heartbeat_interval = null;
        }
    }

    _destroy() {
        this.stop();
    }

    _read() {}
}
