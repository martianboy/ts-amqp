import { Readable } from "stream";

export function createReadableStreamAsyncIterator(stream: Readable): AsyncIterableIterator<any>;