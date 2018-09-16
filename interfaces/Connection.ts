export interface IConnectionOptions {

}
export interface IConnection {
    start(options: IConnection): IConnection;
    startOk(): any;
}

export interface IStartServer {
    version_major: number;
    version_minor: number;
    server_properties: any;
    mechanisms: string;
    locales: string;
}