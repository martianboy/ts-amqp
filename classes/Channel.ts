import { IConnection } from '../interfaces/Connection';
import { EventEmitter } from 'events';
import { IFrame, EFrameTypes, EAMQPClasses, ICommand } from '../interfaces/Protocol';

export default class Channel extends EventEmitter {
    public constructor(
        protected connection: IConnection,
        protected _channelNumber: number
    ) {
        super();
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

    public sendCommand(
        class_id: EAMQPClasses,
        method_id: number,
        args: Record<string, any>,
        body?: Buffer
    ): void {
        this.connection.sendCommand({
            channel: this._channelNumber,
            method: {
                class_id,
                method_id,
                args
            },
            body
        });
    }

    public handleCommand = (command: ICommand) => {
        this.emit('method', command.method);
        this.emit(
            `method:${command.method.class_id}:${command.method.method_id}`,
            command.method.args
        );
    };
}
