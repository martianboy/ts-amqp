export const EXCHANGE_DECLARE = 10;
export const EXCHANGE_DECLARE_OK = 11;

export const EXCHANGE_DELETE = 20;
export const EXCHANGE_DELETE_OK = 21;

export const METHOD_TEMPLATES = {
    [EXCHANGE_DECLARE]: {
        reserved1: 'u',
        exchange: 's',
        type: 's',
        passive: 'P',
        durable: 'P',
        reserved2: 'P',
        reserved3: 'P',
        no_wait: 'P',
        arguments: {}
    },
    [EXCHANGE_DECLARE_OK]: {},
    [EXCHANGE_DELETE]: {
        reserved1: 'u',
        exchange: 's',
        if_unused: 'P',
        no_wait: 'P'
    },
    [EXCHANGE_DELETE_OK]: {}
};
