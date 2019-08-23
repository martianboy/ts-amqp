import * as AMQPBasic from '../protocol/basic';
import { ICommand, IFrame, EFrameTypes, IMethod, EAMQPClasses } from "../interfaces/Protocol";
import Method from "../frames/Method";
import ContentHeader from "../frames/ContentHeader";

function hasContent(method: IMethod) {
    return (
        method.class_id === EAMQPClasses.BASIC &&
        [
            AMQPBasic.BASIC_PUBLISH,
            AMQPBasic.BASIC_RETURN,
            AMQPBasic.BASIC_DELIVER,
            AMQPBasic.BASIC_GET_OK
        ].includes(method.method_id)
    );
}

export default function *toFrames(command: ICommand, frameMax: number): IterableIterator<IFrame> {
    const method = new Method(
        command.method.class_id,
        command.method.method_id,
        command.method.args
    ).toIFrame(command.channel);

    const bodyMax = frameMax - 8;

    yield method;

    if (hasContent(command.method) && command.header) {
        yield new ContentHeader(
            command.method.class_id,
            command.body ? BigInt(command.body.byteLength) : 0n,
            command.header.properties
        ).toIFrame(command.channel);

        if (command.body && command.body.byteLength > 0) {
            if (bodyMax < 1) throw new Error('Max frame size not negotiated!');

            for (let i = 0; i < command.body.byteLength; i += bodyMax) {
                yield {
                    type: EFrameTypes.FRAME_BODY,
                    channel: command.channel,
                    payload: command.body.slice(i, i + bodyMax)
                };
            }
        }
    }
}