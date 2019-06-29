import { IConnection } from '../interfaces/Connection';
import { EAMQPClasses, ICommand, IBasicProperties } from '../interfaces/Protocol';
import { Duplex } from 'stream';

import { createReadableStreamAsyncIterator } from '../utils/streams/async_iterator.js';

interface IWritableCommand {
    class_id: EAMQPClasses,
    method_id: number,
    args: Record<string, any>,
    properties?: IBasicProperties,
    body?: Buffer
}

export default class Channel extends Duplex {
    public constructor(
        protected connection: IConnection,
        protected _channelNumber: number
    ) {
        super({
            emitClose: false,
            readableObjectMode: true,
            writableObjectMode: true
        });
    }

    [Symbol.asyncIterator](): any {
        return createReadableStreamAsyncIterator(this);        
    }

    public get channelNumber(): number {
        return this._channelNumber;
    }

    public sendCommand(
        class_id: EAMQPClasses,
        method_id: number,
        args: Record<string, any>,
        properties?: IBasicProperties,
        body?: Buffer
    ): void {
        this.write({
            class_id,
            method_id,
            args,
            properties,
            body
        });
    }

    _write(command: IWritableCommand, _encoding: string, cb: (error?: Error | null) => void): void {
        this.connection.sendCommand({
            channel: this._channelNumber,
            method: {
                class_id: command.class_id,
                method_id: command.method_id,
                args: command.args
            },
            header: {
                body_size: command.body ? BigInt(command.body.byteLength) : 0n,
                properties: command.properties || {},
                class_id: command.class_id
            },
            body: command.body
        });

        cb();
    }

    protected handleAsyncCommands(_command: ICommand) {
        return false;
    }

    public handleCommand = (command: ICommand) => {
        this.push(command);

        if (!this.handleAsyncCommands(command)) {
            this.emit('method', command.method);
            this.emit(
                `method:${command.method.class_id}:${command.method.method_id}`,
                command.method.args
            );
        }
    };

    _read(_size: number) {}
}
