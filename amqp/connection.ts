export const tplConnectionStart = {
    version_major: 'B',
    version_minor: 'B',
    server_properties: 'F',
    mechanisms: 'S',
    locales: 'S'
};

export const tplConnectionStartOk = {
    client_properties: {
        name: 'S',
        version: 'S'
    },
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
    capabilities: 's',
    insist: 't'
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
