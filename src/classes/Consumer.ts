import { Readable } from 'stream';
import ChannelN from './ChannelN';
import { IDelivery } from '../interfaces/Basic';
import { IConsumer } from '../interfaces/Consumer';

export default class Consumer extends Readable implements IConsumer<ChannelN> {
    public tag: string;
    public channel: ChannelN;

    public constructor(channel: ChannelN, consumer_tag: string) {
        super({
            objectMode: true
        });

        this.tag = consumer_tag;
        this.channel = channel;
    }

    public async cancel() {
        await this.channel.basicCancel(this.tag);
        this.handleCancel(false);
    }

    public handleDelivery(delivery: IDelivery) {
        this.push(delivery);
    }

    public handleCancel(server: boolean) {
        this.emit('cancel', { server });
        this.destroy();
    }

    _read() {}
}
