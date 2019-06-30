import { IConnection } from '../interfaces/Connection';
import * as AMQP from '../protocol';
import { IFrame } from '../interfaces/Protocol';

const HEARTBEAT_FRAME: IFrame = {
    type: AMQP.FRAME_HEARTBEAT,
    channel: 0
};

export default class HeartbeatService {
    protected conn: IConnection;
    protected heartbeat_rate: number = 0;
    protected heartbeat_interval: NodeJS.Timer | null = null;

    public constructor(conn: IConnection) {
        this.conn = conn;

        conn.on('frame', (frame: IFrame) => {
            if (frame.type === AMQP.FRAME_HEARTBEAT) {
                console.log('server heartbeat...');
            }
        });
    }

    public get rate(): number {
        return this.heartbeat_rate;
    }

    public set rate(seconds: number) {
        this.stop();

        if (seconds > 0) {
            this.heartbeat_rate = seconds;
            this.heartbeat_interval = setInterval(
                () => this.beat(),
                this.heartbeat_rate * 1000
            );
            this.beat();
        }
    }

    public beat() {
        console.log('sending heartbeat...');
        this.conn.sendFrame(HEARTBEAT_FRAME);
    }

    public stop() {
        if (this.heartbeat_interval) {
            clearInterval(this.heartbeat_interval);
            this.heartbeat_interval = null;
        }
    }
}