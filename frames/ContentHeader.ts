import { EAMQPClasses, EFrameTypes, IBasicProperties, IHeaderFrame } from '../interfaces/Protocol';
import Frame from './Frame';
import BufferWriter from '../utils/BufferWriter';
import BufferReader from '../utils/BufferReader';

export default class ContentHeader {
    public class_id: EAMQPClasses;
    public body_size: bigint;

    public properties: IBasicProperties = {};

    public constructor(class_id: number, body_size: bigint, properties?: IBasicProperties) {
        this.class_id = class_id;
        this.body_size = body_size;

        if (properties) this.properties = properties;
    }

    public toIFrame(channel: number): IHeaderFrame {
        return {
            type: EFrameTypes.FRAME_HEADER,
            channel,
            header: {
                class_id: this.class_id,
                body_size: this.body_size,
                properties: this.properties
            }
        }
    }

    public toFrame(channel: number): Frame {
        const writer = new BufferWriter(Buffer.alloc(10000));

        writer.writeUInt16BE(this.class_id);
        writer.writeUInt16BE(0);
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

        return new Frame(EFrameTypes.FRAME_HEADER, channel, writer.slice());
    }

    public static fromFrame(frame: Frame): ContentHeader {
        if (frame.type !== EFrameTypes.FRAME_HEADER || !frame.payload) throw new Error('Invalid frame!');

        const reader = new BufferReader(frame.payload);

        const class_id: EAMQPClasses = reader.readUInt16BE();
        /* weight */ reader.readUInt16BE();
        const body_size = reader.readUInt64BE();

        const properties: IBasicProperties = {};

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

        return new ContentHeader(class_id, body_size, properties);
    }
}
