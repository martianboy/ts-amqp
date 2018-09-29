import Channel from './Channel';
import { EChannelFlowState, IChannel } from '../interfaces/Channel';
import { IExchange } from '../interfaces/Exchange';
import { Exchange } from './Exchange';
import { ICloseReason } from '../interfaces/Protocol';
import CloseReason from '../utils/CloseReason';
import { Queue } from './Queue';
import { IQueue, IBinding } from '../interfaces/IQueue';

const CHANNEL_CLASS = 20;

const CHANNEL_OPEN = 10;
const CHANNEL_OPEN_OK = 11;

const CHANNEL_FLOW = 20;
const CHANNEL_FLOW_OK = 21;

const CHANNEL_CLOSE = 40;
const CHANNEL_CLOSE_OK = 41;

export default class ChannelN extends Channel implements IChannel {
    private flow_state: EChannelFlowState = EChannelFlowState.active;
    private exchangeManager: Exchange = new Exchange(this);
    private queueManager: Queue = new Queue(this);

    private expectCommand(
        method_id: number,
        callback: (...args: any[]) => void
    ) {
        this.once(`method:${CHANNEL_CLASS}:${method_id}`, callback);
    }

    public async open(): Promise<this> {
        return new Promise((res: (ch: this) => void, rej) => {
            this.sendMethod(CHANNEL_CLASS, CHANNEL_OPEN, {
                reserved1: ''
            });

            this.expectCommand(CHANNEL_OPEN_OK, () => {
                this.onOpenOk();
                res(this);
            });

            this.expectCommand(CHANNEL_CLOSE, this.onClose);
        });
    }

    private onOpenOk = () => {
        this.emit('open', this);
        this.flow_state = EChannelFlowState.active;

        this.expectCommand(CHANNEL_FLOW, this.onFlow);
    };

    public flow(active: EChannelFlowState) {
        this.flow_state = active;

        this.sendMethod(CHANNEL_CLASS, CHANNEL_FLOW, {
            active: Boolean(active)
        });

        this.expectCommand(CHANNEL_FLOW_OK, this.onFlowOk);

        this.emit('flow', Boolean(active));
    }

    private onFlow = (active: boolean) => {
        this.sendMethod(CHANNEL_CLASS, CHANNEL_FLOW_OK, {
            active
        });

        this.emit('flow', active);
    };

    private onFlowOk = (active: boolean) => {
        // clear timeout?
    };

    public close(): Promise<void> {
        return new Promise((res, rej) => {
            const reason = new CloseReason({
                reply_code: 200,
                reply_text: "Let's connect soon!",
                class_id: 0,
                method_id: 0
            });

            this.sendMethod(CHANNEL_CLASS, CHANNEL_CLOSE, reason);

            this.expectCommand(CHANNEL_CLOSE_OK, () => {
                this.onCloseOk(reason);
                res();
            });

            this.emit('closing', reason);
        });
    }

    public onClose = (reason: ICloseReason) => {
        this.emit('closing', new CloseReason(reason));
        this.sendMethod(CHANNEL_CLASS, CHANNEL_CLOSE_OK, {});
        this.onCloseOk(new CloseReason(reason));
    };

    private onCloseOk = (reason: CloseReason) => {
        this.emit('close', reason);
    };

    public declareExchange(
        exchange: IExchange,
        passive = false,
        no_wait = false
    ) {
        return this.exchangeManager.declare(exchange, passive, no_wait);
    }

    public assertExchange(exchange: IExchange) {
        return this.declareExchange(exchange, true, false);
    }

    public deleteExchange(name: string, if_unused = true, no_wait = false) {
        return this.exchangeManager.delete(name, if_unused, no_wait);
    }

    public declareQueue(queue: IQueue, passive = false, no_wait = false) {
        return this.queueManager.declare(queue, passive, no_wait);
    }

    public bindQueue(binding: IBinding, no_wait = false) {
        return this.queueManager.bind(binding, no_wait);
    }

    public unbindQueue(binding: IBinding) {
        return this.queueManager.unbind(binding);
    }

    public purgeQueue(queue: string, no_wait = false) {
        return this.queueManager.purge(queue, no_wait);
    }

    public deleteQueue(
        queue: string,
        if_unused = false,
        if_empty = false,
        no_wait = false
    ) {
        return this.queueManager.delete(queue, if_unused, if_empty, no_wait);
    }
}
