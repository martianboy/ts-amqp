import Connection from '../src/classes/Connection';
import { ICloseReason } from '../src/interfaces/Protocol';
import debugFn from 'debug';

const debug = debugFn('ts-amqp');

const conn = new Connection({
    maxRetries: 30,
    retryDelay: 1000
});

async function main() {
    await conn.start();
    debug('Connection opened successfully!');

    const ch = await conn.channel();
    debug(`Channel #${ch.channelNumber} successfully opened!`);

    ch.once('channelClose', (reason: ICloseReason) => {
        debug('closing...');
        debug('reason:', reason);
        debug(`Channel #${ch.channelNumber} successfully closed!`);
    });

    await ch.declareExchange({
        name: 'mars.direct',
        type: 'direct',
        durable: true,
        arguments: {}
    });
    debug(`Exchange 'mars.direct' successfully declared.`);

    const queue = 'gholi';

    await ch.declareQueue({
        name: queue,
        durable: true,
        auto_delete: false,
        exclusive: false,
        arguments: {}
    });

    debug(`Queue ${queue} successfully declared.`);

    await ch.bindQueue({
        exchange: 'mars.direct',
        queue,
        routing_key: 'gholi'
    });

    debug(`Successfully bound ${queue} queue to mars.direct exchange.`)

    await ch.unbindQueue({
        exchange: 'mars.direct',
        queue,
        routing_key: 'gholi'
    });

    debug('Unbind successful.')

    await ch.deleteQueue(queue);

    debug('Queue deleted successfully.')

    await ch.deleteExchange('mars.direct');
    debug(`Exchange 'mars.direct' successfully deleted.`);
}

function handleClose(signal: string) {
    debug(`Received ${signal}`);
    conn.close();
}

main().catch((ex) => console.error(ex));

process.on('exit', () => {
    debug('exit');
});
process.on('beforeExit', () => {
    debug('beforeExit');
});
process.on('SIGINT', handleClose);
process.on('SIGTERM', handleClose);
