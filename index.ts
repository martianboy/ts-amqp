import Connection from './classes/Connection';
import { IChannel } from './interfaces/Channel';

const conn = new Connection({
    maxRetries: 30,
    retryDelay: 1000
});

conn.start();

conn.on('open', () => {
    console.log('Connection opened successfully!');
    const ch = conn.createChannel();

    ch.on('open', (ch: IChannel) => {
        console.log(`Channel #${ch.channelNumber} successfully opened!`);
    });

    ch.on('closeOk', (ch: IChannel) => {
        console.log(`Channel #${ch.channelNumber} successfully closed!`);
    });
})

function handleClose(signal: any) {
    console.log(`Received ${signal}`);
    conn.close()
}

process.on('exit', () => { console.log('exit') });
process.on('beforeExit', () => { console.log('beforeExit') });
process.on('SIGINT', handleClose);
process.on('SIGTERM', handleClose);