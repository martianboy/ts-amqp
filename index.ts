import { Connection } from './classes/Connection';

const conn = new Connection()
conn.start();

function handleClose(signal) {
    console.log(`Received ${signal}`);
    conn.close()
}

process.on('exit', () => { console.log('exit') });
process.on('beforeExit', () => { console.log('beforeExit') });
process.on('SIGINT', handleClose);
process.on('SIGTERM', handleClose);