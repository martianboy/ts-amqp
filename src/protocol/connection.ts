export const CONNECTION_START = 10;
export const CONNECTION_START_OK = 11;
export const CONNECTION_TUNE = 30;
export const CONNECTION_TUNE_OK = 31;
export const CONNECTION_OPEN = 40;
export const CONNECTION_OPEN_OK = 41;
export const CONNECTION_CLOSE = 50;
export const CONNECTION_CLOSE_OK = 51;

export const tplConnectionStart = {
    version_major: 'B',
    version_minor: 'B',
    server_properties: 'F',
    mechanisms: 'S',
    locales: 'S'
};

export const tplConnectionStartOk = {
    client_properties: 'F',
    mechanism: 's',
    response: 'S',
    locale: 's'
};

export const tplConnectionTune = {
    channel_max: 'u',
    frame_max: 'i',
    heartbeat: 'u'
};

export const tplConnectionOpen = {
    virtualhost: 's',
    reserved1: 's',
    reserved2: 'P'
};

export const tplConnectionClose = {
    reply_code: 'u',
    reply_text: 's',
    class_id: 'u',
    method_id: 'u'
};

export const METHOD_TEMPLATES = {
    10: tplConnectionStart,
    11: tplConnectionStartOk,
    30: tplConnectionTune,
    31: tplConnectionTune,
    40: tplConnectionOpen,
    41: { reserved: 's' },
    50: tplConnectionClose,
    51: {}
};
