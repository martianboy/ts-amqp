import { IMethod } from "./Method";

export interface IFrame {
    type: number;
    channel: number;
    payload: Buffer;
    frame_end: number;

    method?: IMethod;
}