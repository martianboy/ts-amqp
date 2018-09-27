import Connection from './classes/Connection';
import { ICloseReason } from './interfaces/Protocol';
import { ExchangeNotFoundError } from './classes/Exchange';

const conn = new Connection({
    maxRetries: 30,
    retryDelay: 1000
});

async function main() {
    await conn.start();
    console.log('Connection opened successfully!');

    const ch = await conn.createChannel();
    console.log(`Channel #${ch.channelNumber} successfully opened!`);

    ch.once('close', (reason: ICloseReason) => {
        console.log(`Channel #${ch.channelNumber} successfully closed!`);
    });

    await ch.declareExchange({
        name: 'mars.direct',
        type: 'direct',
        durable: true,
        arguments: {}
    });
    console.log(`Exchange 'mars.direct' successfully declared.`);

    try {
        await ch.assertExchange({
            name: 'mars.gholi',
            type: 'direct',
            durable: true,
            arguments: {}
        });
    }
    catch (ex) {
        if (ex instanceof ExchangeNotFoundError) {
            console.log('mars.gholi exchange does not exist.')
            return;
        }
    }

    await ch.deleteExchange('mars.direct');
    console.log(`Exchange 'mars.direct' successfully deleted.`);
}

function handleClose(signal: any) {
    console.log(`Received ${signal}`);
    conn.close()
}

main().catch((ex: any) => console.error(ex));

process.on('exit', () => { console.log('exit') });
process.on('beforeExit', () => { console.log('beforeExit') });
process.on('SIGINT', handleClose);
process.on('SIGTERM', handleClose);