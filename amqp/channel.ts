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
    10: tplChannelOpen,
    11: tplChannelOpenOk,
    20: tplChannelFlow,
    21: tplChannelFlowOk,
    40: tplChannelClose,
    41: {},
}