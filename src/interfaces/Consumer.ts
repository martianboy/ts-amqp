import { Readable } from "stream";

export interface IConsumer<C> extends Readable {
    tag: string;
    channel: C;

    handleDelivery(delivery: unknown): void;
    cancel(): Promise<void>;
}