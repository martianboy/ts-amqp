import { Readable } from 'stream';
import ChannelN from './ChannelN';
import { IDelivery } from '../interfaces/Basic';

export default class Consumer extends Readable {
    public tag: string;
    private channel: ChannelN;

    public constructor(channel: ChannelN, consumer_tag: string) {
        super({
            objectMode: true
        });

        this.tag = consumer_tag;
        this.channel = channel;
    }

    public cancel() {
        return this.channel.basicCancel(this.tag);
    }

    public handleDelivery(delivery: IDelivery) {
        this.push(delivery);
    }

    _read() {}
}
