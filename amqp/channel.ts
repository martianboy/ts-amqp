const CHANNEL_OPEN = 10;
const CHANNEL_OPEN_OK = 11;

const CHANNEL_FLOW = 20;
const CHANNEL_FLOW_OK = 21;

const CHANNEL_CLOSE = 40;
const CHANNEL_CLOSE_OK = 41;

export const tplChannelOpen = {
    reserved1: 's'
}
export const tplChannelOpenOk = {
    reserved1: 's'
}

export const tplChannelFlow = {
    active: 't'
}
export const tplChannelFlowOk = {
    active: 't'
}

export const tplChannelClose = {
    reply_code: 'u',
    reply_text: 's',
    class_id: 'u',
    method_id: 'u'
}

export const METHOD_TEMPLATES = {
    [CHANNEL_OPEN]: tplChannelOpen,
    [CHANNEL_OPEN_OK]: tplChannelOpenOk,
    [CHANNEL_FLOW]: tplChannelFlow,
    [CHANNEL_FLOW_OK]: tplChannelFlowOk,
    [CHANNEL_CLOSE]: tplChannelClose,
    [CHANNEL_CLOSE_OK]: {},
}