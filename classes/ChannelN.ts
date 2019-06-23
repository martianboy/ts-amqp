import Channel from './Channel';
import { EChannelFlowState } from '../interfaces/Channel';
import { IExchange } from '../interfaces/Exchange';
import { Exchange } from './Exchange';
import { ICloseReason, ICommand, EAMQPClasses } from '../interfaces/Protocol';
import CloseReason from '../utils/CloseReason';
import { Queue } from './Queue';
import { IQueue, IBinding } from '../interfaces/Queue';
import { Basic } from './Basic';
import Consumer from './Consumer';
import { BASIC_DELIVER } from '../protocol/basic';
import { IEnvelope, IDelivery } from '../interfaces/Basic';

const CHANNEL_CLASS = 20;

const CHANNEL_OPEN = 10;
const CHANNEL_OPEN_OK = 11;

const CHANNEL_FLOW = 20;
const CHANNEL_FLOW_OK = 21;

const CHANNEL_CLOSE = 40;
const CHANNEL_CLOSE_OK = 41;

export default class ChannelN extends Channel {
    private flow_state: EChannelFlowState = EChannelFlowState.active;
    private exchangeManager: Exchange = new Exchange(this);
    private queueManager: Queue = new Queue(this);
    private _consumers: Map<string, Consumer> = new Map();

    private basic: Basic = new Basic(this);

    private expectCommand(
        method_id: number,
        callback: (...args: any[]) => void
    ) {
        this.once(`method:${CHANNEL_CLASS}:${method_id}`, callback);
    }

    public async open(): Promise<this> {
        return new Promise((res: (ch: this) => void, rej) => {
            this.sendCommand(CHANNEL_CLASS, CHANNEL_OPEN, {
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

        this.sendCommand(CHANNEL_CLASS, CHANNEL_FLOW, {
            active: Boolean(active)
        });

        this.expectCommand(CHANNEL_FLOW_OK, this.onFlowOk);

        this.emit('flow', Boolean(active));
    }

    private onFlow = (active: boolean) => {
        this.sendCommand(CHANNEL_CLASS, CHANNEL_FLOW_OK, {
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

            this.sendCommand(CHANNEL_CLASS, CHANNEL_CLOSE, reason);

            this.expectCommand(CHANNEL_CLOSE_OK, () => {
                this.onCloseOk(reason);
                res();
            });

            this.emit('closing', reason);
        });
    }

    public onClose = (reason: ICloseReason) => {
        this.emit('closing', new CloseReason(reason));
        this.sendCommand(CHANNEL_CLASS, CHANNEL_CLOSE_OK, {});
        this.onCloseOk(new CloseReason(reason));
    };

    private onCloseOk = (reason: CloseReason) => {
        this.emit('close', reason);
    };

    private handleDelivery(command: ICommand) {
        const m = command.method;

        const envelope: IEnvelope = {
            deliveryTag: m.args.delivery_tag,
            exchange: m.args.exchange,
            redeliver: m.args.redeliver,
            routingKey: m.args.routing_key
        };

        const delivery: IDelivery = {
            body: command.body!,
            properties: command.header!.properties,
            envelope,
        }

        const c = this._consumers.get(m.args.consumer_tag);

        if (!c) throw new Error('No consumer found!');

        c.handleDelivery(delivery);
    }

    protected handleAsyncCommands(command: ICommand) {
        const m = command.method

        if (m.class_id !== EAMQPClasses.BASIC) return false;

        switch (m.method_id) {
            case BASIC_DELIVER:
                setImmediate(() => { this.handleDelivery(command); });

                return true;
            default:
                return false;
        }
    }


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

    public async basicConsume(queue: string) {
        const { consumer_tag } = await this.basic.consume(queue);
        const consumer = new Consumer(this, consumer_tag);

        this._consumers.set(consumer_tag, consumer);

        return consumer;
    }

    public async basicCancel(consumer_tag: string) {
        if (!this._consumers.has(consumer_tag)) throw new Error('No consumer found!');

        await this.basic.cancel(consumer_tag);

        this._consumers.delete(consumer_tag);
    }

    public basicGet(queue: string) {
        return this.basic.get(queue, true);
    }

    public basicAck(delivery_tag: bigint, multiple: boolean = false) {
        return this.basic.ack(delivery_tag, multiple);
    }

    public basicPublish(
        exchange_name: string | null,
        routing_key: string,
        body: Buffer,
        mandatory: boolean = false,
        immediate: boolean = false
    ) {
        return this.basic.publish(exchange_name, routing_key, mandatory, immediate, body);
    }
}
