import { Connection } from '../src';

const QUEUE = 'movies';

async function main() {
    const conn = new Connection({
        maxRetries: 30,
        retryDelay: 1000
    });

    await conn.start();

    const ch = await conn.channel();

    await ch.declareQueue({
        name: QUEUE,
        durable: true,
        auto_delete: false,
        exclusive: false,
        arguments: {}
    });

    ch.basicPublish(null, 'movies', {}, Buffer.from('Hello!'));

    await conn.close();
}

main().catch((ex) => console.error(ex));
