export const QUEUE_DECLARE = 10;
export const QUEUE_DECLARE_OK = 11;

export const QUEUE_BIND = 20;
export const QUEUE_BIND_OK = 21;

export const QUEUE_UNBIND = 50;
export const QUEUE_UNBIND_OK = 51;

export const QUEUE_PURGE = 30;
export const QUEUE_PURGE_OK = 31;

export const QUEUE_DELETE = 40;
export const QUEUE_DELETE_OK = 41;

export const METHOD_TEMPLATES = {
    [QUEUE_DECLARE]: {
        reserved1: 'u',
        queue: 's',
        passive: 'P',
        durable: 'P',
        exclusive: 'P',
        auto_delete: 'P',
        no_wait: 'P',
        arguments: 'F'
    },
    [QUEUE_DECLARE_OK]: {
        queue: 's',
        message_count: 'i',
        consumer_count: 'i'
    },
    [QUEUE_BIND]: {
        reserved1: 'u',
        queue: 's',
        exchange: 's',
        routing_key: 's',
        no_wait: 'P',
        arguments: {}
    },
    [QUEUE_BIND_OK]: {},
    [QUEUE_UNBIND]: {
        reserved1: 'u',
        queue: 's',
        exchange: 's',
        routing_key: 's',
        no_wait: 'P',
        arguments: {}
    },
    [QUEUE_UNBIND_OK]: {},
    [QUEUE_PURGE]: {
        reserved1: 'u',
        queue: 's',
        no_wait: 'P'
    },
    [QUEUE_PURGE_OK]: {
        message_count: 'i'
    },
    [QUEUE_DELETE]: {
        reserved1: 'u',
        queue: 's',
        if_unused: 'P',
        if_empty: 'P',
        no_wait: 'P'
    },
    [QUEUE_DELETE_OK]: {
        message_count: 'i'
    }
};
