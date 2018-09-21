import * as AMQP from '../amqp';

import { IConnection } from "../interfaces/Connection";
import { EventEmitter } from "events";
import { IFrame, EFrameTypes } from "../interfaces/Protocol";

export default class Channel extends EventEmitter {
    public constructor(
        protected connection: IConnection,
        protected _channelNumber: number
    ) {
        super();

        connection.on('frame', this.onIncomingFrame);
    }

    public get channelNumber(): number {
        return this._channelNumber;
    }

    public sendMethod( class_id: number, method_id: number, args: Object) {
        this.connection.sendMethod(
            this._channelNumber,
            class_id,
            method_id,
            args
        );
    }

    protected onIncomingFrame = (frame: IFrame) => {
        if (frame.channel !== this._channelNumber) return;

        switch (frame.type) {
            case EFrameTypes.FRAME_METHOD:
                this.emit('method', frame.method);
                this.emit(`method:${frame.method.class_id}:${frame.method.method_id}`, frame.method.args);
                break;
        }
    }
}