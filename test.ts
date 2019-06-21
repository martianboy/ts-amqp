import Connection from './classes/Connection';
import { ICloseReason } from './interfaces/Protocol';
import ChannelN from './classes/ChannelN';

const conn = new Connection({
    maxRetries: 30,
    retryDelay: 1000
});

let ch: ChannelN;
const queue = 'gholi';

async function main() {
    await conn.start();
    console.log('Connection opened successfully!');

    ch = await conn.createChannel();
    console.log(`Channel #${ch.channelNumber} successfully opened!`);

    ch.once('close', (reason: ICloseReason) => {
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

    await ch.bindQueue({
        exchange: 'amq.direct',
        queue,
        routing_key: 'listing'
    });

    console.log(`Successfully bound ${queue} queue to mars.direct exchange.`)

    const { consumer_tag } = await ch.basicConsume(queue);

    console.log(`Successfully started consumer ${consumer_tag} on queue ${queue}`);

    const res = await ch.basicGet(queue);

    console.log('Got messages:');
    console.log(res);
}

async function close() {
    await ch.unbindQueue({
        exchange: 'mars.direct',
        queue,
        routing_key: 'listing'
    });

    console.log('Unbind successful.')

    await ch.deleteQueue(queue);

    console.log('Queue deleted successfully.')

    await ch.deleteExchange('mars.direct');
    console.log(`Exchange 'mars.direct' successfully deleted.`);
}
function handleClose(signal: any) {

    console.log(`Received ${signal}`);
    conn.close();
}

main().catch((ex: any) => console.error(ex));

process.on('exit', () => {
    console.log('exit');
});
process.on('beforeExit', () => {
    console.log('beforeExit');
});
process.on('SIGINT', handleClose);
process.on('SIGTERM', handleClose);
