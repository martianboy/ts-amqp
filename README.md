# AMQP 0-9-1 client library for Node

ts-amqp is a modern library for communicating with AMQP 0-9-1 servers (e.g. RabbitMQ) from NodeJS applications. It is built with TypeScript and heavily uses Node's streams.

## Install

    npm i ts-amqp

## Examples

For publishing a JSON message to an exchange:

```javascript
const conn = new Connection({
    maxRetries: 30,
    retryDelay: 1000
});

await conn.start();

const ch = await conn.channel();

await ch.declareQueue({
    name: 'movies',
    durable: true,
    auto_delete: false,
    exclusive: false,
    arguments: {}
});

ch.json.write({
    routing_key: 'movies',
    body: {
        message: 'Hello, World!'
    }
});

await conn.close();
```

For consuming from a queue:

```javascript
const conn = new Connection({
    maxRetries: 30,
    retryDelay: 1000
});

await conn.start();
const ch = await conn.channel();

await ch.declareQueue({
    name: 'movies',
    durable: true,
    auto_delete: false,
    exclusive: false,
    arguments: {}
});

const consumer = await ch.basicConsume('movies');

consumer.pipe(
    new Transform({
        objectMode: true,
        transform(chunk, _encoding, cb) {
            console.log(chunk.body.toString('utf-8'))
            cb();
        }
    })
)
```