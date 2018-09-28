import { ICloseReason, EAMQPClasses } from '../interfaces/Protocol';

export default class CloseReason extends Error implements ICloseReason {
    public reply_code: number;
    public reply_text: string;
    public class_id: EAMQPClasses;
    public method_id: number;

    public constructor(reason: ICloseReason) {
        super(reason.reply_text);

        this.reply_code = reason.reply_code;
        this.reply_text = reason.reply_text;
        this.class_id = reason.class_id;
        this.method_id = reason.method_id;
    }
}
