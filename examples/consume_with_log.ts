import Connection from '../src/classes/Connection';
import { ICloseReason } from '../src/interfaces/Protocol';
import ChannelN from '../src/classes/ChannelN';
import { Transform, Writable, TransformCallback } from 'stream';
import { IDelivery } from '../src/interfaces/Basic';

const conn = new Connection({
    maxRetries: 30,
    retryDelay: 1000
});

let ch: ChannelN;
const queue = 'gholi';

async function main() {
    await conn.start();
    console.log('Connection opened successfully!');

    ch = await conn.channel();
    console.log(`Channel #${ch.channelNumber} successfully opened!`);

    ch.once('channelClose', (reason: ICloseReason) => {
        console.log(`Channel #${ch.channelNumber} successfully closed!`);
    });

    await ch.declareQueue({
        name: queue,
        durable: true,
        auto_delete: false,
        exclusive: false,
        arguments: {}
    });

    console.log(`Queue ${queue} successfully declared.`);

    // ch.basicPublish(null, 'gholi', Buffer.from('Hello, world!'));

    const consumer = await ch.basicConsume(queue);

    console.log(
        `Successfully started consumer ${consumer.tag} on queue ${queue}`
    );

    consumer
        .pipe(
            new Transform({
                writableObjectMode: true,
                transform(chunk: IDelivery, encoding: string, cb: TransformCallback) {
                    cb(null, JSON.stringify({
                        envelope: {
                            ...chunk.envelope,
                            deliveryTag: Number(chunk.envelope.deliveryTag)
                        },
                        properties: chunk.properties,
                        body: chunk.body ? chunk.body.toString('utf-8') : ''
                    }, null, 2));
                }
            })
        )
        .pipe(new Writable({
            write(chunk: Buffer, encoding: string, cb) {
                console.log(chunk.toString('utf-8'));
                cb();
            }
        }));
}

function handleClose(signal: string) {
    console.log(`Received ${signal}`);
    conn.close();
    console.log('Connection closed successfully.');
}

main().catch((ex) => console.error(ex));

process.on('exit', () => {
    console.log('exit');
});
process.on('beforeExit', () => {
    console.log('beforeExit');
});
process.on('SIGINT', handleClose);
process.on('SIGTERM', handleClose);
