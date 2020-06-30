import debugFn from 'debug';
const debug = debugFn('amqp:encoder');

import { IFrame, EFrameTypes } from "../interfaces/Protocol";
import BufferWriter from "./BufferWriter";
import Method from '../frames/Method';
import ContentHeader from '../frames/ContentHeader';
import Frame from '../frames/Frame';

export default function encode(frame: IFrame, frameMax: number, buf: Buffer): Buffer {
    if (frameMax === undefined) {
        throw new Error('Max frame size is not specified.');
    }

    const writer = new BufferWriter(buf);

    switch (frame.type) {
        case EFrameTypes.FRAME_METHOD:
            debug(
                'encoding message frame %d:%d...',
                frame.method.class_id,
                frame.method.method_id
            );

            new Method(frame.method.class_id, frame.method.method_id, frame.method.args)
                .toFrame(frame.channel)
                .writeToBuffer(writer);

            break;

        case EFrameTypes.FRAME_HEADER:
            debug('encoding header frame...');

            new ContentHeader(
                frame.header.class_id,
                frame.header.body_size,
                frame.header.properties
            )
                .toFrame(frame.channel)
                .writeToBuffer(writer);

            break;

        case EFrameTypes.FRAME_BODY:
            debug('encoding body frame...');

            new Frame(EFrameTypes.FRAME_BODY, frame.channel, frame.payload).writeToBuffer(
                writer
            );

            break;

        default:
            throw new Error(`Unexpected frame type ${frame.type}.`);
    }

    if (writer.offset > frameMax) {
        throw new Error('Frame overflow!');
    }

    return writer.slice();
}