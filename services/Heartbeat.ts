import { IConnection } from "../interfaces/Connection";
import * as AMQP from '../amqp';
import { IFrame } from "../interfaces/Protocol";

export class HeartbeatService {
    protected heartbeat_rate: number;
    protected heartbeat_interval: NodeJS.Timer;

    public constructor(protected conn: IConnection) {
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
            this.heartbeat_interval = setInterval(() => this.beat(), this.heartbeat_rate * 1000);
            this.beat();
        }
    }

    public beat() {
        console.log('sending heartbeat...');
        this.conn.sendFrame(AMQP.HEARTBEAT_BUF);
    }

    public stop() {
        clearInterval(this.heartbeat_interval);
        this.heartbeat_interval = null;
    }
}