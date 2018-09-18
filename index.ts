import { Connection } from './classes/Connection';

const conn = new Connection()
conn.start()

process.on('beforeExit', () => {
    conn.shutdown()
})