import { IConnection } from '../interfaces/Connection';
import { EventEmitter } from 'events';
import { IFrame, EFrameTypes, EAMQPClasses } from '../interfaces/Protocol';

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

    protected buildMethodFrame(
        class_id: EAMQPClasses,
        method_id: number,
        args: Record<string, any>
    ): IFrame {
        return {
            type: EFrameTypes.FRAME_METHOD,
            channel: this._channelNumber,
            method: {
                class_id,
                method_id,
                args
            }
        };
    }

    public sendMethod(
        class_id: EAMQPClasses,
        method_id: number,
        args: Record<string, any>
    ): void {
        this.connection.sendFrame(
            this.buildMethodFrame(class_id, method_id, args)
        );
    }

    protected onIncomingFrame = (frame: IFrame) => {
        if (frame.channel !== this._channelNumber) return;

        switch (frame.type) {
            case EFrameTypes.FRAME_METHOD:
                this.emit('method', frame.method);
                this.emit(
                    `method:${frame.method.class_id}:${frame.method.method_id}`,
                    frame.method.args
                );
                break;
        }
    };
}
