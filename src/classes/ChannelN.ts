import debugFn from 'debug';
const debug = debugFn('amqp:channeln');

import Channel, { EChanState } from './Channel';
import { EChannelFlowState, IWritableCommand } from '../interfaces/Channel';
import { IExchange } from '../interfaces/Exchange';
import { Exchange } from './Exchange';
import { ICloseReason, ICommand, EAMQPClasses, IBasicProperties } from '../interfaces/Protocol';
import CloseReason from '../utils/CloseReason';
import { Queue } from './Queue';
import { IQueue, IBinding } from '../interfaces/Queue';
import { Basic } from './Basic';
import Consumer from './Consumer';
import {
    BASIC_DELIVER,
    BASIC_CANCEL,
    BASIC_RETURN,
    BASIC_NACK,
    BASIC_ACK
} from '../protocol/basic';
import { IEnvelope, IDelivery, IDeliverArgs, IBasicConsumeResponse, IMessage } from '../interfaces/Basic';
import {
    CHANNEL_OPEN,
    CHANNEL_OPEN_OK,
    CHANNEL_CLOSE,
    CHANNEL_FLOW,
    CHANNEL_FLOW_OK,
    CHANNEL_CLOSE_OK
} from '../protocol/channel';
import { IConnection } from '../interfaces/Connection';
import { JsonPublisher } from './JsonPublisher';

export default class ChannelN extends Channel {
    private flow_state: EChannelFlowState = EChannelFlowState.active;
    private exchangeManager: Exchange = new Exchange(this);
    private queueManager: Queue = new Queue(this);
    private _consumers: Map<string, Consumer> = new Map();

    public json: JsonPublisher;

    constructor(connection: IConnection, _channelNumber: number) {
        super(connection, _channelNumber);

        this.json = new JsonPublisher();
        this.json.pipe(this);
    }

    private basic: Basic = new Basic(this);

    private expectCommand<T>(method_id: number, callback: (args: T) => void) {
        this.once(`method:${EAMQPClasses.CHANNEL}:${method_id}`, callback);
    }

    protected allowCommand(command: IWritableCommand): boolean {
        switch (this._channelState) {
            case EChanState.open:
                return (
                    command.class_id !== EAMQPClasses.CHANNEL ||
                    command.method_id !== CHANNEL_CLOSE_OK
                );
            case EChanState.closing:
                return (
                    command.class_id === EAMQPClasses.CHANNEL ||
                    command.method_id === CHANNEL_CLOSE_OK
                );
            default:
                return (
                    command.class_id === EAMQPClasses.CHANNEL || command.method_id === CHANNEL_OPEN
                );
        }
    }

    public async open(): Promise<this> {
        return new Promise((res: (ch: this) => void, rej) => {
            this.sendCommand(EAMQPClasses.CHANNEL, CHANNEL_OPEN, {
                reserved1: ''
            });

            this.expectCommand(CHANNEL_OPEN_OK, () => {
                this.onOpenOk();
                res(this);
            });

            this.expectCommand(CHANNEL_CLOSE, (reason: ICloseReason) => {
                // Wait for other event handlers to clean up
                setImmediate(() => this.onClose(reason));
            });
        });
    }

    private onOpenOk = () => {
        this.emit('open', this);
        this._channelState = EChanState.open;
        this.flow_state = EChannelFlowState.active;

        this.expectCommand(CHANNEL_FLOW, this.onFlow);
    };

    public flow(active: EChannelFlowState) {
        this.flow_state = active;

        this.sendCommand(EAMQPClasses.CHANNEL, CHANNEL_FLOW, {
            active: Boolean(active)
        });

        this.expectCommand(CHANNEL_FLOW_OK, this.onFlowOk);

        this.emit('flow', Boolean(active));
    }

    private onFlow = (active: boolean) => {
        this.sendCommand(EAMQPClasses.CHANNEL, CHANNEL_FLOW_OK, {
            active
        });

        this.emit('flow', active);
    };

    private onFlowOk = (active: boolean) => {
        // clear timeout?
    };

    public close(): Promise<void> {
        this._channelState = EChanState.closing;

        return new Promise((res, rej) => {
            const reason_args = {
                reply_code: 200,
                reply_text: "Let's connect soon!",
                class_id: 0,
                method_id: 0
            };
            const reason = new CloseReason(reason_args);

            this.sendCommand(EAMQPClasses.CHANNEL, CHANNEL_CLOSE, reason_args);

            this.expectCommand(CHANNEL_CLOSE_OK, () => {
                this.onCloseOk(reason);
                res();
            });

            this.emit('closing', reason);
        });
    }

    public onClose = (reason: ICloseReason) => {
        debug(`closing channel #${this.channelNumber}...`);
        debug('Close Reason:', reason);

        this._channelState = EChanState.closing;

        this.emit('closing', new CloseReason(reason));
        this.sendCommand(EAMQPClasses.CHANNEL, CHANNEL_CLOSE_OK, {});
        this.onCloseOk(new CloseReason(reason));
    };

    private onCloseOk = (reason: CloseReason) => {
        this._channelState = EChanState.closed;

        debug('destroying json publisher stream...');
        this.json.destroy();
        debug('destroying channel stream...');
        this.destroy();
        debug('emit channelClose...');
        this.emit('channelClose', reason);
    };

    private handleDelivery(command: ICommand<IDeliverArgs>) {
        const m = command.method;

        const envelope: IEnvelope = {
            deliveryTag: m.args.delivery_tag,
            exchange: m.args.exchange,
            redeliver: m.args.redeliver,
            routingKey: m.args.routing_key
        };

        const delivery: IDelivery = {
            body: command.body,
            properties: command.header ? command.header.properties : {},
            envelope
        };

        const c = this._consumers.get(m.args.consumer_tag);

        if (!c) {
            console.warn('ChannelN::handleDelivery: No consumer found!');
            return;
        }

        c.handleDelivery(delivery);
    }

    private handleCancel(command: ICommand<IBasicConsumeResponse>) {
        const m = command.method;
        const c = this._consumers.get(m.args.consumer_tag);

        if (!c) throw new Error('ChannelN::handleCancel: No consumer found!');

        debug(`Received basic.cancel for ${m.args.consumer_tag}`);

        c.handleCancel(true);

        this._consumers.delete(m.args.consumer_tag);
    }

    protected handleAsyncCommands(command: ICommand) {
        const m = command.method;

        if (m.class_id !== EAMQPClasses.BASIC) return false;

        switch (m.method_id) {
            case BASIC_DELIVER:
                setImmediate(() => {
                    this.handleDelivery(command as ICommand<IDeliverArgs>);
                });

                return true;

            case BASIC_CANCEL:
                setImmediate(() => {
                    this.handleCancel(command as ICommand<IBasicConsumeResponse>);
                });

                return true;

            case BASIC_RETURN:
            case BASIC_ACK:
            case BASIC_NACK:
                return true;

            default:
                return false;
        }
    }

    public declareExchange(exchange: IExchange, passive = false) {
        return this.exchangeManager.declare(exchange, passive);
    }

    public assertExchange(exchange: IExchange) {
        return this.declareExchange(exchange, true);
    }

    public deleteExchange(name: string, if_unused = true) {
        return this.exchangeManager.delete(name, if_unused);
    }

    public declareQueue(queue: IQueue, passive = false) {
        return this.queueManager.declare(queue, passive);
    }

    public bindQueue(binding: IBinding) {
        return this.queueManager.bind(binding);
    }

    public unbindQueue(binding: IBinding) {
        return this.queueManager.unbind(binding);
    }

    public purgeQueue(queue: string) {
        return this.queueManager.purge(queue);
    }

    public deleteQueue(queue: string, if_unused = false, if_empty = false) {
        return this.queueManager.delete(queue, if_unused, if_empty);
    }

    public async basicQos(prefetch_count: number, global: boolean = false) {
        return this.basic.qos(prefetch_count, global);
    }

    public async basicConsume(queue: string, consumer_tag: string = '') {
        const { consumer_tag: _tag } = await this.basic.consume(queue, consumer_tag);
        const consumer = new Consumer(this, _tag);

        this._consumers.set(_tag, consumer);

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

    public basicNack(delivery_tag: bigint, multiple: boolean = false, requeue: boolean = false) {
        return this.basic.nack(delivery_tag, multiple, requeue);
    }

    public basicReject(delivery_tag: bigint, requeue: boolean = false) {
        return this.basic.reject(delivery_tag, requeue);
    }

    public basicRecover(requeue: boolean = false) {
        return this.basic.recover(requeue);
    }

    public basicPublish(
        exchange_name: string | null,
        routing_key: string,
        properties: IBasicProperties,
        body: Buffer,
        mandatory: boolean = false,
        immediate: boolean = false
    ) {
        return this.basic.publish(
            exchange_name,
            routing_key,
            mandatory,
            immediate,
            properties,
            body
        );
    }

    public basicPublishJson(
        exchange_name: string | null,
        routing_key: string,
        properties: IBasicProperties,
        body: Record<string, unknown> | unknown[] | string | number | boolean | null,
        mandatory: boolean = false,
        immediate: boolean = false
    ) {
        return this.basicPublish(
            exchange_name || null,
            routing_key,
            {
                ...properties,
                contentType: 'application/json'
            },
            Buffer.from(JSON.stringify(body)),
            mandatory,
            immediate
        )
    }
}
