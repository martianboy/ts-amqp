export interface IConsumer<C> {
    tag: string;
    channel: C;

    handleDelivery(delivery: unknown): void;
}