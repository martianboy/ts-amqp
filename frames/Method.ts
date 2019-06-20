import * as AMQP from '../protocol';
import { EAMQPClasses, EFrameTypes } from '../interfaces/Protocol';
import Frame from './Frame';
import BufferWriter from '../utils/BufferWriter';
import BufferReader from '../utils/BufferReader';

export default class Method<T extends Record<string, any>> {
    public class_id: EAMQPClasses;
    public method_id: number;
    public args?: T;

    public constructor(class_id: number, method_id: number, args?: T) {
        this.class_id = class_id;
        this.method_id = method_id;
        this.args = args;
    }

    public toFrame(channel: number): Frame {
        const writer = new BufferWriter(Buffer.alloc(10000));

        const tpl = AMQP.classes[this.class_id].METHOD_TEMPLATES[
            this.method_id
        ];

        writer.writeUInt16BE(this.class_id);
        writer.writeUInt16BE(this.method_id);

        if (this.args) {
            writer.writeToBuffer(tpl, this.args);
        }

        return new Frame(EFrameTypes.FRAME_METHOD, channel, writer.slice());
    }

    public static fromFrame<T>(frame: Frame): Method<T> {
        if (frame.type !== EFrameTypes.FRAME_METHOD || !frame.payload) throw new Error('Invalid frame!');

        const reader = new BufferReader(frame.payload);

        const class_id: EAMQPClasses = reader.readUInt16BE();
        const method_id = reader.readUInt16BE();

        const args: T = reader.readTableFromTemplate(
            AMQP.classes[class_id].METHOD_TEMPLATES[method_id]
        );

        return new Method<T>(class_id, method_id, args);
    }
}
