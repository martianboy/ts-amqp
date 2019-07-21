import { IConnection, EConnState, IConnectionParams } from '../../src/interfaces/Connection';
import { ICommand } from '../../src/interfaces/Protocol';
import { EventEmitter } from "events";

class MockConnection extends EventEmitter implements IConnection {
    start() {}
    sendCommand(command: ICommand) {}

    state: EConnState = EConnState.open;
    connectionParameters: IConnectionParams = {
        maxRetries: 1,
        retryDelay: 0,
        host: 'localhost',
        port: 5672,
        username: 'guest',
        password: 'guest',
        locale: 'en_US',
        vhost: '/',
        keepAlive: false,
        timeout: 0
    };
}

export default MockConnection;