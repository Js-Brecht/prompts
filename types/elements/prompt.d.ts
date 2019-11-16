/// <reference types="node" />
import { EventEmitter } from 'events';
import { Key } from 'readline';
import InputHandler from '../util/inputHandler';
interface IPromptOpts {
    stdin: NodeJS.ReadStream;
    stdout: NodeJS.WriteStream;
}
/**
 * Base prompt skeleton
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */
export declare abstract class Prompt extends EventEmitter {
    protected readonly inputHandler: InputHandler;
    protected firstRender: boolean;
    protected out: NodeJS.WriteStream;
    protected aborted?: boolean;
    protected closed?: boolean;
    protected value?: string;
    protected constructor(opts?: IPromptOpts);
    protected onKeypress(str: string, key: Key): void;
    protected close(): void;
    protected abstract _(c: string, key: Key): void;
    protected abstract first(key?: Key): void;
    protected abstract last(key?: Key): void;
    protected abstract up(key?: Key): void;
    protected abstract down(key?: Key): void;
    protected abstract left(key?: Key): void;
    protected abstract right(key?: Key): void;
    protected abstract submit(key?: Key): void;
    protected abstract abort(key?: Key): void;
    protected abstract reset(key?: Key): void;
    protected abstract delete(key?: Key): void;
    protected abstract deleteForward(key?: Key): void;
    protected abstract next(key?: Key): void;
    protected abstract nextPage(key?: Key): void;
    protected abstract prevPage(key?: Key): void;
}
export {};
