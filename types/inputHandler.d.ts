/// <reference types="node" />
import { Key, Interface } from 'readline';
import { EventEmitter } from 'events';
import { Renderer } from './renderer';
declare type IInputTypes = string | number | [string, string] | [number, number] | RegExp;
declare type IValidInputs = IInputTypes | IInputTypes[];
declare type IFilterKeyTypes = string | Key | RegExp;
declare type IFilterKeys = IFilterKeyTypes | IFilterKeyTypes[];
declare module 'readline' {
    interface Interface {
        line: string;
        cursor: number;
    }
}
interface IInputHandlerOpts {
    validInputs: IValidInputs;
    filterKeys: IFilterKeys;
}
export declare class InputHandler extends EventEmitter implements NodeJS.ReadableStream {
    private rl;
    private readonly stdin;
    private readonly stdout;
    private _paused;
    private _renderer?;
    private validInput?;
    private filterKeys?;
    constructor(stdin?: NodeJS.ReadStream, opts?: IInputHandlerOpts);
    private handleKeypress;
    pause(): this;
    resume(): this;
    close(): void;
    get cursor(): number;
    hideCursor(): void;
    showCursor(): void;
    get value(): string;
    set value(newVal: string);
    reset(): void;
    get inputLen(): number;
    get readline(): Interface;
    ding(): void;
    registerRenderer(newRenderer: Renderer): void;
    private processValidInputs;
    private processFilterKeys;
    private isValidInput;
    private isFilteredInput;
    get readable(): boolean;
    read(): string;
    setEncoding(encoding: string): this;
    isPaused(): boolean;
    pipe<T extends NodeJS.WritableStream>(destination: T, options?: {
        end?: boolean;
    }): T;
    unpipe(destination?: NodeJS.WritableStream): this;
    unshift(chunk: string | Uint8Array, encoding?: BufferEncoding): void;
    wrap(oldStream: NodeJS.ReadableStream): this;
    /**
     * Needs to be defined to be compliant with the ReadableStream interface
     * It has to return an object with an `asyncIterator`, so just return
     * the `readline` Interface's asyncIterator, rather than recreate it.
     *
     * `readline` will create a new Readable stream, and have it return all
     * of the input that the Interface receives.
     *
     * So, it goes like this:
     * this[Symbol.asyncIterator() =>
     * 		readline[Symbol.asyncIterator]() => new Readable()[Symbol.asyncIterator]()
     *
     * This should work, because it will essentially iterate over the input
     * this class feeds it, asyncronously, so it will work for a `for/await` loop.
     *
     */
    [Symbol.asyncIterator](): AsyncIterableIterator<string | Buffer>;
}
export default InputHandler;
