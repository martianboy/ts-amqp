import { once } from 'events';
import debugFn from 'debug';
const debug = debugFn('amqp:pool');

import ChannelN from './ChannelN';
import Connection from './Connection';
import { EConnState } from '../interfaces/Connection';

type Releaser = () => void;
interface ChannelWithReleaser {
    release: Releaser;
    channel: ChannelN;
}
type ReleaserResolver = (result: ChannelWithReleaser) => void;
type AcquireRejection = (err: Error) => void;
interface QueueRequest {
    resolve: ReleaserResolver;
    reject: AcquireRejection;
}

export default class ChannelPool {
    private _queue: QueueRequest[] = [];
    private _pool: ChannelN[] = [];
    private _acquisitions: Map<ChannelN, Promise<void>> = new Map();
    private _releaseResolvers: Map<ChannelN, () => void> = new Map();

    private _conn: Connection;
    private _size: number;
    private _isOpen: boolean = false;
    private prefetch?: number;

    constructor(connection: Connection, size: number, prefetch?: number) {
        this._conn = connection;
        this._size = size;
        this.prefetch = prefetch;

        this._conn.once('closing', this.softCleanUp);
        this._conn.once('connection:failed', this.hardCleanUp);
    }

    private softCleanUp = () => {
        debug('ChannelPool: soft cleanup');
        this._isOpen = false;

        for (const resolver of this._releaseResolvers.values()) {
            resolver();
        }
    };

    private hardCleanUp = () => {
        debug('ChannelPool: hard cleanup');
        this.softCleanUp();

        for (const { reject } of this._queue) {
            reject(new Error('ChannelPool: Connection failed.'));
        }
    };

    async *[Symbol.asyncIterator](): AsyncIterableIterator<ChannelWithReleaser> {
        if (!this._isOpen) {
            throw new Error('ChannelPool: [Symbol.asyncIterator]() called before pool is open.');
        }

        while (this._isOpen) {
            yield await this.acquire();
        }
    }

    public get size(): number {
        return this._size;
    }

    public get isOpen(): boolean {
        return this._isOpen;
    }

    public async open() {
        if (this._conn.state !== EConnState.open) {
            debug('ChannelPool: awaiting connection start');
            await once(this._conn, 'open');
        }

        this._isOpen = true;

        debug('ChannelPool: initializing the pool');
        for (let i = 0; i < this._size; i++) {
            this._pool.push(await this.openChannel());
        }
    }

    public async close() {
        this._isOpen = false;

        this._conn.off('closing', this.softCleanUp);
        this._conn.off('connection:failed', this.hardCleanUp);

        debug('ChannelPool: awaiting complete pool release');
        await Promise.all(this._acquisitions.values());

        debug('ChannelPool: closing all channels');
        for (const ch of this._pool) {
            await ch.close();
        }

        debug('ChannelPool: pool closed successfully');
    }

    public acquire(): Promise<ChannelWithReleaser> {
        if (!this._isOpen) {
            throw new Error('ChannelPool: acquire() called before pool is open.');
        }

        debug('ChannelPool: acquire()');

        const promise = new Promise((res: ReleaserResolver, rej: AcquireRejection) =>
            this._queue.push({
                resolve: res,
                reject: rej
            })
        );

        if (this._pool.length > 0) {
            debug(
                `ChannelPool: ${this._pool.length} channels available in the pool. dispatch immediately`
            );
            this.dispatchChannels();
        } else {
            debug('ChannelPool: no channels available in the pool. awaiting...');
        }

        return promise;
    }

    public mapOver<T, R>(arr: T[], fn: (ch: ChannelN, item: T) => Promise<R>) {
        return arr.map(async item => {
            const { channel, release } = await this.acquire();
            const result = await fn(channel, item);
            release();

            return result;
        });
    }

    private async onChannelClose(ch: ChannelN) {
        debug(`ChannelPool: channel ${ch.channelNumber} closed`);

        this._acquisitions.delete(ch);
        this._releaseResolvers.delete(ch);

        const idx = this._pool.indexOf(ch);
        if (this._isOpen) {
            debug(`ChannelPool: replacing closed channel ${ch.channelNumber} with a new one`);
            this._pool.splice(idx, 1, await this.openChannel());
        } else {
            debug('ChannelPool: pool is closing. dropping closed channel from the pool');
            this._pool.splice(idx, 1);
        }
    }

    private async openChannel(): Promise<ChannelN> {
        const ch = await this._conn.channel();
        ch.once('channelClose', this.onChannelClose.bind(this, ch));

        if (this.prefetch) await ch.basicQos(this.prefetch, false);

        setImmediate(() => this.dispatchChannels());

        return ch;
    }

    private releaser(ch: ChannelN) {
        debug(`ChannelPool: channel ${ch.channelNumber} released`);
        this._pool.push(ch);

        const releaseResolver = this._releaseResolvers.get(ch)!;
        releaseResolver();

        debug('ChannelPool: dispatch released channel to new requests');
        this.dispatchChannels();
    }

    private dispatchChannels() {
        while (this._queue.length > 0 && this._pool.length > 0) {
            const dispatcher = this._queue.shift()!;
            const ch = this._pool.shift()!;
            const acquisition = new Promise<void>(res => this._releaseResolvers.set(ch, res));
            this._acquisitions.set(ch, acquisition);

            dispatcher.resolve({
                channel: ch,
                release: this.releaser.bind(this, ch)
            });

            debug(`ChannelPool: channel ${ch.channelNumber} acquired`);
        }
    }
}
