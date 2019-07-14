import { Transform, TransformCallback, Writable } from 'stream';
import debugFn from 'debug';

import { Connection } from '../src';

import { IDelivery } from '../src/interfaces/Basic';

const debug = debugFn('ts-amqp')
const QUEUE = 'movies';

async function main() {
    const conn = new Connection({
        maxRetries: 30,
        retryDelay: 1000
    });

    process.on('SIGINT', () => conn.close());
    process.on('SIGTERM', () => conn.close());

    await conn.start();
    const ch = await conn.channel();

    await ch.declareQueue({
        name: QUEUE,
        durable: true,
        auto_delete: false,
        exclusive: false,
        arguments: {
            maxLength: 10
        }
    });

    const consumer = await ch.basicConsume(QUEUE);

    consumer
        .pipe(
            new Transform({
                objectMode: true,
                transform(
                    chunk: IDelivery,
                    _encoding: string,
                    cb: TransformCallback
                ) {
                    cb(null, {
                        envelope: {
                            ...chunk.envelope,
                            deliveryTag: Number(chunk.envelope.deliveryTag)
                        },
                        properties: chunk.properties,
                        body: chunk.body ? chunk.body.toString('utf-8') : ''
                    });
                }
            })
        )
        .pipe(
            new Writable({
                objectMode: true,
                write(chunk: Buffer, _encoding: string, cb) {
                    debug(chunk);
                    cb();
                }
            })
        );
}

main().catch((ex: unknown) => console.error(ex));
