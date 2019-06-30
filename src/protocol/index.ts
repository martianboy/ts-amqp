export const PORT = 5672;

export const AMQP_0_9_1 = 'AMQP' + String.fromCharCode(0, 0, 9, 1);
export const PROTOCOL_HEADER = AMQP_0_9_1;

export const FRAME_METHOD = 1;
export const FRAME_HEADER = 0;
export const FRAME_BODY = 3;
export const FRAME_HEARTBEAT = 8;
export const FRAME_END = 206;

export const FT_KEY_SIZE = 1;
export const FT_TAG_SIZE = 1;

export const DOMAIN_TO_TYPE = {
    bit: 'bit',
    'channel-id': 'longstr',
    'class-id': 'short',
    'consumer-tag': 'shortstr',
    'delivery-tag': 'longlong',
    destination: 'shortstr',
    duration: 'longlong',
    'exchange-name': 'shortstr',
    long: 'long',
    longlong: 'longlong',
    longstr: 'longstr',
    'method-id': 'short',
    'no-ack': 'bit',
    'no-local': 'bit',
    octet: 'octet',
    offset: 'longlong',
    path: 'shortstr',
    'peer-properties': 'table',
    'queue-name': 'shortstr',
    redelivered: 'bit',
    reference: 'longstr',
    'reject-code': 'short',
    'reject-text': 'shortstr',
    'reply-code': 'short',
    'reply-text': 'shortstr',
    'security-token': 'longstr',
    short: 'short',
    shortstr: 'shortstr',
    table: 'table',
    timestamp: 'timestamp'
};

export const TYPE_TO_TAG = {};

import { EAMQPClasses, TUnknownArgs } from '../interfaces/Protocol';

import * as amqp_connection from './connection';
import * as amqp_channel from './channel';
import * as amqp_exchange from './exchange';
import * as amqp_queue from './queue';
import * as amqp_basic from './basic';

interface IClassTemplates {
    METHOD_TEMPLATES: Record<number, TUnknownArgs>;
}

export const classes: Record<EAMQPClasses, IClassTemplates> = {
    [EAMQPClasses.CONNECTION]: amqp_connection,
    [EAMQPClasses.CHANNEL]: amqp_channel,
    [EAMQPClasses.EXCHANGE]: amqp_exchange,
    [EAMQPClasses.QUEUE]: amqp_queue,
    [EAMQPClasses.BASIC]: amqp_basic
};
