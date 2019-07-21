import debugFn from 'debug';
const debug = debugFn('ts-amqp');

import { IConnection } from '../interfaces/Connection';
import { EAMQPClasses, ICommand, IBasicProperties } from '../interfaces/Protocol';
import { Duplex } from 'stream';

import { createReadableStreamAsyncIterator } from '../utils/streams/async_iterator.js';
import { IWritableCommand } from '../interfaces/Channel';

export enum EChanState {
    closing = 'closing',
    closed = 'closed',
    open = 'open'
}

export default class Channel extends Duplex {
    protected connection: IConnection;
    protected _channelNumber: number;
    protected _state: EChanState = EChanState.closed;

    public constructor(connection: IConnection, _channelNumber: number) {
        super({
            readableObjectMode: true,
            writableObjectMode: true
        });

        this.connection = connection;
        this._channelNumber = _channelNumber;
    }

    [Symbol.asyncIterator](): AsyncIterableIterator<ICommand> {
        return createReadableStreamAsyncIterator<ICommand>(this);
    }

    public get channelNumber(): number {
        return this._channelNumber;
    }

    public sendCommand(
        class_id: EAMQPClasses,
        method_id: number,
        args: Record<string, unknown>,
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

    protected allowCommand(command: IWritableCommand): boolean {
        return true;
    }

    _write(command: IWritableCommand, _encoding: string, cb: (error?: Error | null) => void): void {
        debug(`Channel:_write(${command.class_id}:${command.method_id})`);

        if (!this.allowCommand(command)) {
            debug(`Channel:_write(${command.class_id}:${command.method_id}) - NOT ALLOWED!`);

            return cb();
        }

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
        if (!this.handleAsyncCommands(command)) {
            this.push(command);

            this.emit('method', command.method);
            this.emit(
                `method:${command.method.class_id}:${command.method.method_id}`,
                command.method.args
            );
        }
    };

    _read(_size: number) {}
}
