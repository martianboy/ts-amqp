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

export const METHOD_TEMPLATES = {
    [BASIC_CONSUME]: {
        reserved1: 'u',
        queue: 's',
        consumer_tag: 's',
        no_local: 'P',
        no_ack: 'P',
        exclusive: 'P',
        no_wait: 'P',
        arguments: {}
    },
    [BASIC_CONSUME_OK]: {
        consumer_tag: 's'
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
    }
};
