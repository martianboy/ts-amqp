import Channel from "./Channel";
import { EChannelFlowState, IChannel } from "../interfaces/Channel";

const CHANNEL_CLASS = 20;

const CHANNEL_OPEN = 10;
const CHANNEL_OPEN_OK = 11;

const CHANNEL_FLOW = 20;
const CHANNEL_FLOW_OK = 21;

const CHANNEL_CLOSE = 40;
const CHANNEL_CLOSE_OK = 41;

export default class ChannelN extends Channel implements IChannel {
    private flow_state: EChannelFlowState = EChannelFlowState.active;

    private expectCommand(method_id: number, callback: (...args: any[]) => void) {
        this.once(`method:${CHANNEL_CLASS}:${method_id}`, callback);
    }

    public open() {
        this.sendMethod(CHANNEL_CLASS, CHANNEL_OPEN, {
            reserved1: ''
        });

        this.expectCommand(CHANNEL_OPEN_OK, this.onOpenOk);
    }

    private onOpenOk = () => {
        this.emit('open', this);
        this.flow_state = EChannelFlowState.active;

        this.expectCommand(CHANNEL_FLOW, this.onFlow);
    }

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
    }

    private onFlowOk = (active: boolean) => {
        // clear timeout?
    }

    public close(): Promise<void> {
        return new Promise((res, rej) => {
            this.sendMethod(CHANNEL_CLASS, CHANNEL_CLOSE, {
                reply_code: 200,
                reply_text: 'Let\'s connect soon!',
                class_id: 0,
                method_id: 0
            });
    
            this.expectCommand(CHANNEL_CLOSE_OK, () => {
                this.onCloseOk();
                res();
            });

            this.emit('close', this);
        });
    }

    public onClose = () => {
        this.sendMethod(CHANNEL_CLASS, CHANNEL_CLOSE_OK, {});
        this.onCloseOk();
    }

    private onCloseOk = () => {
        this.emit('closeOk', this);
    }
}