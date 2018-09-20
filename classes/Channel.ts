import * as AMQP from '../amqp';

import { IConnection } from "../interfaces/Connection";
import { EventEmitter } from "events";
import { IFrame } from "../interfaces/Protocol";

enum EChannelFlowState {
    active = 0,
    inactive = 1
}

export default class Channel extends EventEmitter {
    private flow: EChannelFlowState;

    public constructor(
        protected connection: IConnection,
        protected channelNumber: number
    ) {
        super();

        connection.on('frame', this.onIncomingFrame);
    }

    public sendMethod( class_id: number, method_id: number, args: Object) {
        this.connection.sendMethod(
            this.channelNumber,
            class_id,
            method_id,
            args
        );
    }

    protected onIncomingFrame = (frame: IFrame) => {
        if (frame.channel !== this.channelNumber) return;

        switch (frame.type) {
            case AMQP.FRAME_METHOD:
                this.emit('method', frame.method);
                this.emit(`method:${frame.method.class_id}:${frame.method.method_id}`, frame.method.args);
                break;
        }
    }
}
