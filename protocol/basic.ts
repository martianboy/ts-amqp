const BASIC_QOS = 10;
const BASIC_QOS_OK = 11;

const BASIC_CONSUME = 20;
const BASIC_CONSUME_OK = 21;

const BASIC_CANCEL = 30;
const BASIC_CANCEL_OK = 31;

const BASIC_GET = 70;
const BASIC_GET_OK = 71;
const BASIC_GET_EMPTY = 72;

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
