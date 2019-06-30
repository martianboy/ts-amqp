import { Readable } from "stream";

export function createReadableStreamAsyncIterator<T>(stream: Readable): AsyncIterableIterator<T>;