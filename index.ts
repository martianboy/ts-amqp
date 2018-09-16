import { connect } from 'net';
import * as AMQP from './amqp';
import BufferReader from './BufferReader';
import { IStartServer } from './interfaces/Connection';

function read_frame_header(buf: Buffer) {
    const reader = new BufferReader(buf);
    const header = reader.readTableFromTemplate(AMQP.classes[10].tplFrameHeader);

    if (header.frame_end !== AMQP.FRAME_END) {
        throw new Error('Malformed frame end octet!');
    }

    return header;
}

function read_method_frame(buf: Buffer) {
    const reader = new BufferReader(buf)

    const class_id = reader.readUInt16BE();
    const method_id = reader.readUInt16BE();
    const args = reader.readTableFromTemplate(AMQP.classes[class_id].METHOD_TEMPLATES[method_id])

    return {
        class_id,
        method_id,
        args
    };
}

function connection_start() {
    const socket = connect(AMQP.PORT)

    socket.on("connect", () => {
        socket.write(AMQP.PROTOCOL_HEADER);
    })

    socket.on("data", (buf: Buffer) => {
        const header = read_frame_header(buf)
        const frame = read_method_frame(header.payload)

        console.log(header)
        console.log(frame)

        socket.end()
    })

    socket.on("close", (had_error: boolean) => {
        if (had_error) {
            console.log('Close: An error occured.')
        }
        else {
            console.log('Close: connection closed successfully.')
        }
    })

    socket.on("error", (err) => {
        console.error(err)
    })

    socket.on("timeout", () => {
        console.log("Timeout while connecting to the server.")
    })

    socket.on("end", () => {
        console.log("Socket ended.")
    })
}

connection_start()
