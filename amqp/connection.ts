export const tplFrameHeader = {
    type: 'B',
    channel: 'u',
    payload: 'x',
    frame_end: 'B'
};

export const tplStartServer = {
    version_major: 'B',
    version_minor: 'B',
    server_properties: 'F',
    mechanisms: 'S',
    locales: 'S'
};

export const METHOD_TEMPLATES = {
    10: tplStartServer
}