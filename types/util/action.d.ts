/// <reference types="node" />
import { Key } from 'readline';
export declare const action: (key: Key, isSelect: boolean) => boolean | void | "left" | "right" | "abort" | "reset" | "submit" | "up" | "down" | "next" | "first" | "last" | "delete" | "deleteForward" | "nextPage" | "prevPage";
export default action;
