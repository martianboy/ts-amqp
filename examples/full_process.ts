import Connection from '../src/classes/Connection';
import { ICloseReason } from '../src/interfaces/Protocol';

const conn = new Connection({
    maxRetries: 30,
    retryDelay: 1000
});

async function main() {
    await conn.start();
    console.log('Connection opened successfully!');

    const ch = await conn.channel();
    console.log(`Channel #${ch.channelNumber} successfully opened!`);

    ch.once('channelClose', (reason: ICloseReason) => {
        console.log('closing...');
        console.log('reason:', reason);
        console.log(`Channel #${ch.channelNumber} successfully closed!`);
    });

    await ch.declareExchange({
        name: 'mars.direct',
        type: 'direct',
        durable: true,
        arguments: {}
    });
    console.log(`Exchange 'mars.direct' successfully declared.`);

    const queue = 'gholi';

    await ch.declareQueue({
        name: queue,
        durable: true,
        auto_delete: false,
        exclusive: false,
        arguments: {}
    });

    console.log(`Queue ${queue} successfully declared.`);

    await ch.bindQueue({
        exchange: 'mars.direct',
        queue,
        routing_key: 'gholi'
    });

    console.log(`Successfully bound ${queue} queue to mars.direct exchange.`)

    await ch.unbindQueue({
        exchange: 'mars.direct',
        queue,
        routing_key: 'gholi'
    });

    console.log('Unbind successful.')

    await ch.deleteQueue(queue);

    console.log('Queue deleted successfully.')

    await ch.deleteExchange('mars.direct');
    console.log(`Exchange 'mars.direct' successfully deleted.`);
}

function handleClose(signal: string) {
    console.log(`Received ${signal}`);
    conn.close();
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
