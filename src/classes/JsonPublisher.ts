import { IMessage } from "../interfaces/Basic";
import { TransformCallback, Transform } from "stream";
import { EAMQPClasses } from "../interfaces/Protocol";
import { BASIC_PUBLISH } from "../protocol/basic";

export class JsonPublisher extends Transform {
    constructor() {
        super({
            objectMode: true
        });
    }

    _transform(message: IMessage<unknown>, encoding: string, cb: TransformCallback) {
        cb(undefined, {
            class_id: EAMQPClasses.BASIC,
            method_id: BASIC_PUBLISH,
            args: {
                reserved1: 0,
                exchange_name: message.exchange || '',
                routing_key: message.routing_key,
                mandatory: message.mandatory || false,
                immediate: message.immediate || false
            },
            properties: message.properties || {},
            body: Buffer.from(JSON.stringify(message.body))
        });
    }
}
