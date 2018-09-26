import Connection from './classes/Connection';
import { IChannel } from './interfaces/Channel';

const conn = new Connection({
    maxRetries: 30,
    retryDelay: 1000
});

async function main() {
    await conn.start();
    console.log('Connection opened successfully!');

    const ch = await conn.createChannel();
    console.log(`Channel #${ch.channelNumber} successfully opened!`);

    await ch.declareExchange({
        name: 'mars.direct',
        type: 'direct',
        durable: true,
        no_wait: false,
        passive: false,
        arguments: {}
    });
    console.log(`Exchange 'mars.direct' successfully declared.`);

    await ch.deleteExchange('mars.direct');
    console.log(`Exchange 'mars.direct' successfully deleted.`);

    ch.on('closeOk', (ch: IChannel) => {
        console.log(`Channel #${ch.channelNumber} successfully closed!`);
    });
}

function handleClose(signal: any) {
    console.log(`Received ${signal}`);
    conn.close()
}

main().then(() => {}, (ex: any) => console.error(ex));

process.on('exit', () => { console.log('exit') });
process.on('beforeExit', () => { console.log('beforeExit') });
process.on('SIGINT', handleClose);
process.on('SIGTERM', handleClose);