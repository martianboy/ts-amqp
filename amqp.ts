export const PORT = 5672

export const AMQP_0_9_1 = "AMQP" + String.fromCharCode(0, 0, 9, 1);
export const PROTOCOL_HEADER = AMQP_0_9_1;

export const FRAME_METHOD = 1;
export const FRAME_HEADER = 0;
export const FRAME_BODY = 3;
export const FRAME_HEARTBEAT = 8;
export const FRAME_END = 206;