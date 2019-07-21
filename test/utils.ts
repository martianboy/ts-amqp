export function toByteArray(n: bigint): Uint8Array {
    const result = new Uint8Array(8).fill(0);

    for (let i = 7, x = n; x > 0; x = x >> 8n) {
        result[i--] = Number(x % 256n);
    }

    return result;
}

export function dateToByteArray(d: Date): Uint8Array {
    return toByteArray(BigInt(Math.floor(d.getTime() / 1000)));
}