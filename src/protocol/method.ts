import {
    IMethodFrame,
    IMethod,
    EFrameTypes,
    EAMQPClasses,
    TUnknownArgs
} from '../interfaces/Protocol';

export default class Method implements IMethodFrame {
    public type: EFrameTypes.FRAME_METHOD = EFrameTypes.FRAME_METHOD;
    public channel: number;
    public method: IMethod;

    public constructor(
        channel: EAMQPClasses,
        class_id: EAMQPClasses,
        method_id: number,
        args: TUnknownArgs
    ) {
        this.channel = channel;
        this.method = {
            class_id,
            method_id,
            args
        };
    }
}
