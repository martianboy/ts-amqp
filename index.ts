import { Connection } from './classes/Connection';

const conn = new Connection({
    maxRetries: 30,
    retryDelay: 1000
});

conn.start();

conn.on('open-ok', () => {
    console.log('Connection opened successfully!');
})

function handleClose(signal) {
    console.log(`Received ${signal}`);
    conn.close()
}

process.on('exit', () => { console.log('exit') });
process.on('beforeExit', () => { console.log('beforeExit') });
process.on('SIGINT', handleClose);
process.on('SIGTERM', handleClose);