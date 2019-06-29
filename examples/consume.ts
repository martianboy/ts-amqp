import { Transform, TransformCallback, Writable } from 'stream';
import { Connection } from '..';

import { IDelivery } from '../interfaces/Basic';

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
        arguments: {}
    });

    const consumer = await ch.basicConsume(QUEUE);

    consumer
        .pipe(
            new Transform({
                writableObjectMode: true,
                transform(
                    chunk: IDelivery,
                    _encoding: string,
                    cb: TransformCallback
                ) {
                    cb(
                        null,
                        JSON.stringify(
                            {
                                envelope: {
                                    ...chunk.envelope,
                                    deliveryTag: Number(
                                        chunk.envelope.deliveryTag
                                    )
                                },
                                properties: chunk.properties,
                                body: chunk.body!.toString('utf-8')
                            },
                            null,
                            2
                        )
                    );
                }
            })
        )
        .pipe(
            new Writable({
                write(chunk: Buffer, _encoding: string, cb) {
                    console.log(chunk.toString('utf-8'));
                    cb();
                }
            })
        );
}

main().catch((ex: any) => console.error(ex));
