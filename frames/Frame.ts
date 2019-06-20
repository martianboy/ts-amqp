import { EFrameTypes } from "../interfaces/Protocol";

import * as AMQP from '../protocol/index'
import { MalformedFrameException } from "../protocol/exceptions";

import BufferReader from "../utils/BufferReader";
import BufferWriter from "../utils/BufferWriter";

export default class Frame {
    public type: EFrameTypes;
    public channel: number;

    public payload?: Buffer;

    public constructor(type: EFrameTypes, channel: number, payload?: Buffer) {
        this.type = type;
        this.channel = channel;
        this.payload = payload;
    }

    public writeToBuffer(writer: BufferWriter): void {
        writer.writeUInt8(this.type);
        writer.writeUInt16BE(this.channel);

        if (this.payload) {
            writer.writeBufferSlice(this.payload);
        }
        else {
            writer.writeUInt32BE(0);
        }

        writer.writeUInt8(AMQP.FRAME_END);
    }

    public static fromBuffer(reader: BufferReader): Frame {
        const type: EFrameTypes = reader.readUInt8();
        const channel = reader.readUInt16BE();
        const payload = reader.readBufferSlice();

        const frameEndMarker = reader.readUInt8();
        if (frameEndMarker != AMQP.FRAME_END) {
            throw new MalformedFrameException("Bad frame end marker: " + frameEndMarker);
        }

        return new Frame(type, channel, payload)
    }
}