import ChannelN from '../classes/ChannelN';
import IntAllocator from '../utils/IntAllocator';
import { IConnection } from '../interfaces/Connection';

export class UnknownChannelError extends Error {
    public constructor(channelNumber: number) {
        super(`Unknown channel number ${channelNumber}`);
    }
}

export class ChannelNumberReservedError extends Error {
    public constructor(channelNumber: number) {
        super(
            `Channel number ${channelNumber} is already in use by another channel.`
        );
    }
}

export class NoFreeChannelsAvailable extends Error {
    public constructor() {
        super('No free channels available.');
    }
}

export default class ChannelManager {
    private channels: Map<number, ChannelN> = new Map();
    private channelNumberAllocator: IntAllocator;

    private _channelMax: number;

    public constructor(channelMax: number) {
        if (channelMax === 0) {
            channelMax = (1 << 16) - 1;
        }

        this._channelMax = channelMax;
        this.channelNumberAllocator = new IntAllocator(1, channelMax);
    }

    public get channelMax() {
        return this._channelMax;
    }

    public getChannel(channelNumber: number): ChannelN {
        const ch = this.channels.get(channelNumber);

        if (!ch) {
            throw new UnknownChannelError(channelNumber);
        }

        return ch;
    }

    public async createChannel(
        connection: IConnection,
        channelNumber?: number
    ) {
        if (!channelNumber) {
            channelNumber = this.channelNumberAllocator.allocate();
        }

        if (channelNumber == -1) {
            throw new NoFreeChannelsAvailable();
        }

        if (!this.channelNumberAllocator.reserve(channelNumber)) {
            throw new ChannelNumberReservedError(this.channelMax);
        }

        const ch = new ChannelN(connection, channelNumber);
        this.channels.set(channelNumber, ch);

        ch.on('channelClose', this.onChannelClose.bind(this, ch));

        return ch.open();
    }

    public onChannelClose(channel: ChannelN) {
        this.releaseChannel(channel.channelNumber);
    }

    private releaseChannel(channelNumber: number) {
        this.channels.delete(channelNumber);
        this.channelNumberAllocator.free(channelNumber);
    }

    public closeAll(): Promise<void[]> {
        return Promise.all(
            Array.from(this.channels.values()).map(ch => ch.close())
        );
    }
}
