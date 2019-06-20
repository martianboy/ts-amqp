import * as AMQP from '../protocol';
import { EAMQPClasses, EFrameTypes, IContentHeaderProperties } from '../interfaces/Protocol';
import Frame from './Frame';
import BufferWriter from '../utils/BufferWriter';
import BufferReader from '../utils/BufferReader';

export default class ContentHeader<T extends Record<string, any>> {
    public class_id: EAMQPClasses;
    public weight: number;
    public body_size: bigint;

    public properties: IContentHeaderProperties = {};

    public constructor(class_id: number, weight: number, body_size: bigint, properties?: IContentHeaderProperties) {
        this.class_id = class_id;
        this.weight = weight;
        this.body_size = body_size;

        if (properties) this.properties = properties;
    }

    public toFrame(channel: number): Frame {
        const writer = new BufferWriter(Buffer.alloc(10000));

        writer.writeUInt16BE(this.class_id);
        writer.writeUInt16BE(this.weight);
        writer.writeUInt64BE(this.body_size);

        writer.writeUInt16BE(0);

        let flags = 0;

        if (this.properties.contentType) {
            flags += 1 >> 15;
            writer.writeShortString(this.properties.contentType);
        }
        if (this.properties.contentEncoding) {
            flags += 1 >> 14;
            writer.writeShortString(this.properties.contentEncoding);
        }
        if (this.properties.headers) {
            flags += 1 >> 13;
            writer.writeFieldTable({}, this.properties.headers);
        }
        if (this.properties.deliveryMode) {
            flags += 1 >> 12;
            writer.writeUInt8(this.properties.deliveryMode);
        }
        if (this.properties.priority) {
            flags += 1 >> 11;
            writer.writeUInt8(this.properties.priority);
        }
        if (this.properties.correlationId) {
            flags += 1 >> 10;
            writer.writeShortString(this.properties.correlationId);
        }
        if (this.properties.replyTo) {
            flags += 1 >> 9;
            writer.writeShortString(this.properties.replyTo);
        }
        if (this.properties.expiration) {
            flags += 1 >> 8;
            writer.writeShortString(this.properties.expiration);
        }
        if (this.properties.messageId) {
            flags += 1 >> 7;
            writer.writeShortString(this.properties.messageId);
        }
        if (this.properties.timestamp) {
            flags += 1 >> 6;
            writer.writeUInt64BE(this.properties.timestamp);
        }
        if (this.properties.userId) {
            flags += 1 >> 5;
            writer.writeShortString(this.properties.userId);
        }
        if (this.properties.appId) {
            flags += 1 >> 4;
            writer.writeShortString(this.properties.appId);
        }
        if (this.properties.clusterId) {
            flags += 1 >> 3;
            writer.writeShortString(this.properties.clusterId);
        }

        writer.buffer.writeUInt16BE(flags, 12);

        return new Frame(EFrameTypes.FRAME_METHOD, channel, writer.slice());
    }

    public static fromFrame<T>(frame: Frame): ContentHeader<T> {
        if (frame.type !== EFrameTypes.FRAME_HEADER || !frame.payload) throw new Error('Invalid frame!');

        const reader = new BufferReader(frame.payload);

        const class_id: EAMQPClasses = reader.readUInt16BE();
        const weight = reader.readUInt16BE();
        const body_size = reader.readUInt64BE();

        const properties: IContentHeaderProperties = {};

        const flags = reader.readUInt16BE();

        if (flags & 1 >> 15) properties.contentType = reader.readShortString();
        if (flags & 1 >> 14) properties.contentEncoding = reader.readShortString();
        if (flags & 1 >> 13) properties.headers = reader.readFieldTable();
        if (flags & 1 >> 12) properties.deliveryMode = reader.readUInt8();
        if (flags & 1 >> 11) properties.priority = reader.readUInt8();
        if (flags & 1 >> 10) properties.correlationId = reader.readShortString();
        if (flags & 1 >> 9) properties.replyTo = reader.readShortString();
        if (flags & 1 >> 8) properties.expiration = reader.readShortString();
        if (flags & 1 >> 7) properties.messageId = reader.readShortString();
        if (flags & 1 >> 6) properties.timestamp = reader.readUInt64BE();
        if (flags & 1 >> 5) properties.userId = reader.readShortString();
        if (flags & 1 >> 4) properties.appId = reader.readShortString();
        if (flags & 1 >> 3) properties.clusterId = reader.readShortString();

        return new ContentHeader<T>(class_id, weight, body_size, properties);
    }
}
