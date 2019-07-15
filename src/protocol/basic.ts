export const BASIC_QOS = 10;
export const BASIC_QOS_OK = 11;

export const BASIC_CONSUME = 20;
export const BASIC_CONSUME_OK = 21;

export const BASIC_CANCEL = 30;
export const BASIC_CANCEL_OK = 31;

export const BASIC_PUBLISH = 40;
export const BASIC_RETURN = 50;
export const BASIC_DELIVER = 60;

export const BASIC_GET = 70;
export const BASIC_GET_OK = 71;
export const BASIC_GET_EMPTY = 72;

export const BASIC_ACK = 80;
export const BASIC_REJECT = 90;

export const BASIC_RECOVER_ASYNC = 100;
export const BASIC_RECOVER = 110;
export const BASIC_RECOVER_OK = 111;

export const BASIC_NACK = 120;

export const METHOD_TEMPLATES = {
    [BASIC_QOS]: {
        prefetch_size: 'i',
        prefetch_count: 'u',
        global: 'P'
    },
    [BASIC_QOS_OK]: {},
    [BASIC_CONSUME]: {
        reserved1: 'u',
        queue: 's',
        consumer_tag: 's',
        no_local: 'P',
        no_ack: 'P',
        exclusive: 'P',
        no_wait: 'P',
        arguments: 'F'
    },
    [BASIC_CONSUME_OK]: {
        consumer_tag: 's'
    },
    [BASIC_CANCEL]: {
        consumer_tag: 's',
        no_wait: 'P'
    },
    [BASIC_CANCEL_OK]: {
        consumer_tag: 's'
    },
    [BASIC_PUBLISH]: {
        reserved1: 'u',
        exchange_name: 's',
        routing_key: 's',
        mandatory: 'P',
        immediate: 'P'
    },
    [BASIC_RETURN]: {
        reply_code: 'u',
        reply_text: 's',
        exchange_name: 's',
        routing_key: 's'
    },
    [BASIC_DELIVER]: {
        consumer_tag: 's',
        delivery_tag: 'l',
        redelivered: 'P',
        exchange_name: 's',
        routing_key: 's'
    },
    [BASIC_GET]: {
        reserved1: 'u',
        queue: 's',
        no_ack: 'P'
    },
    [BASIC_GET_OK]: {
        delivery_tag: 'l',
        redelivered: 'P',
        exchange_name: 's',
        routing_key: 's',
        message_count: 'i'
    },
    [BASIC_GET_EMPTY]: {
        reserved1: 's'
    },
    [BASIC_ACK]: {
        delivery_tag: 'l',
        multiple: 'P'
    },
    [BASIC_REJECT]: {
        delivery_tag: 'l',
        requeue: 'P'
    },
    [BASIC_RECOVER_ASYNC]: {
        requeue: 'P'
    },
    [BASIC_RECOVER]: {
        requeue: 'P'
    },
    [BASIC_RECOVER_OK]: {},
    [BASIC_NACK]: {
        delivery_tag: 'l',
        multiple: 'P',
        requeue: 'P'
    }
};
