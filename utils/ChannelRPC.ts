import { ICloseReason, EAMQPClasses } from '../interfaces/Protocol';
import { IChannel } from '../interfaces/Channel';

export default class ChannelRPC {
    public constructor(
        protected ch: IChannel,
        protected class_id: EAMQPClasses
    ) {}

    public expectCommand(method: number, callback: (...args: any[]) => void) {
        this.ch.once(`method:${this.class_id}:${method}`, callback);
    }

    public call<T>(method: number, resp_method: number, args: any): Promise<T> {
        var already_resolved = false;

        return new Promise((resolve, reject) => {
            this.ch.sendCommand(this.class_id, method, args);
            if (args.no_wait === true) {
                already_resolved = true;
                return resolve();
            } else {
                this.expectCommand(resp_method, (args: any) => {
                    already_resolved = true;
                    this.ch.off('closing', onError);
                    resolve(args);
                });
            }

            const onError = (reason: ICloseReason) => {
                if (already_resolved) return;

                if (
                    reason.class_id === EAMQPClasses.EXCHANGE &&
                    reason.method_id === method &&
                    reason.reply_code >= 400 // Is it possible that server closes with a < 400 code?
                ) {
                    reject(reason);
                }
            };

            this.ch.once('closing', onError);
        });
    }
}
