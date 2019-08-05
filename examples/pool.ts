import Connection from '../src/classes/Connection';
import ChannelPool from '../src/classes/ChannelPool';

const QUEUE = 'movies';

async function main() {
    const conn = new Connection();
    const pool = new ChannelPool(conn, 5);

    await conn.start();
    await pool.open();

    const { channel, release } = await pool.acquire();

    await channel.declareQueue({
        name: QUEUE,
        durable: true,
        auto_delete: false,
        exclusive: false,
        arguments: {
            maxLength: 10
        }
    });

    const arr: string[] = Array(5).fill(QUEUE);
    await Promise.all(pool.mapOver(arr, async (ch, item) => {
        return await ch.declareQueue({
            name: item,
            durable: true,
            auto_delete: false,
            exclusive: false,
            arguments: {
                maxLength: 10
            }
        })
    }));

    release();

    // await pool.close();
    await conn.close();
}

main().catch(ex => console.error(ex));
