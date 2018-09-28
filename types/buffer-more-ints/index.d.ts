declare module 'buffer-more-ints' {
    export function readInt64BE(buf: Buffer, offset: number): number;
    export function readUInt64BE(buf: Buffer, offset: number): number;
}
