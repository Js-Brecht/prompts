import { Key, Interface, createInterface, emitKeypressEvents } from 'readline';
import { EventEmitter } from 'events';
import { Renderer } from './renderer';
import { beep, cursor } from 'sisteransi';
type IInputTypes = string | number | [string, string] | [number, number] | RegExp;
type IValidInputs = IInputTypes | IInputTypes[];
type IFilterKeyTypes = string | Key | RegExp;
type IFilterKeys = IFilterKeyTypes | IFilterKeyTypes[];

// This are not exposed in types.  Readline is stable; submit PR for @types/readline change
// See issue https://github.com/nodejs/node/issues/30347
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

enum ProcInputType {
	append = 'append',
	replace = 'replace',
}

function isPrintable(chr?: string | number) {
	const code = chr === undefined ?
		0 :
		typeof chr === 'string' ?
			chr.charCodeAt(0) :
			chr;
	return code >= 32 && code <= 126;
}

export class InputHandler extends EventEmitter implements NodeJS.ReadableStream {
	private rl: Interface;
	private readonly stdin = process.stdin;
	private readonly stdout = process.stdout;

	private _paused: boolean = false;
	private _renderer?: Renderer;

	private validInput?: ([number, number] | number | RegExp)[];
	private filterKeys?: (Key | RegExp)[];
	public constructor(stdin?: NodeJS.ReadStream, opts?: IInputHandlerOpts) {
		super();
		if (stdin) this.stdin = stdin;

		if (!this.stdin.isTTY) {
			throw new Error('Input stream must be a TTY!');
		}

		if (opts) {
			if (opts.validInputs) this.processValidInputs(opts.validInputs, ProcInputType.replace);
			if (opts.filterKeys) this.processFilterKeys(opts.filterKeys, ProcInputType.replace);
		}

		this.rl = createInterface({
			input: this,
			terminal: true,
		});

		const wasRaw = this.stdin.isRaw;
		this.stdin.setRawMode(true);
		emitKeypressEvents(this.stdin, this.rl);

		this.handleKeypress = this.handleKeypress.bind(this);
		this.stdin.on('keypress', this.handleKeypress);

		this.rl.on('line', (d) => {
			this.value = d;
		});
		this.rl.once('close', () => {
			this.stdin.setRawMode(wasRaw);
			this.stdin.removeListener('keypress', this.handleKeypress);
		});

	}
	private handleKeypress(chr: any, key: Key): void {
		if (this._paused) return;
		const oldCursor = this.cursor;
		const oldValue = this.value;
		if (this.validInput && isPrintable(key.sequence)) {
			if (!this.isValidInput(key.sequence)) return this.ding();
		}
		if (this.filterKeys) {
			if (this.isFilteredInput(key)) return this.ding();
		}
		this.emit('keypress', chr, key);
		if (oldCursor !== this.cursor && this._renderer) this._renderer.restoreCursor();
		if (oldValue !== this.value) this.emit('change', this.value);
	}
	public pause(): this {
    this._paused = true;
    this.stdin.pause();
		return this;
	}
	public resume(): this {
    this._paused = false;
    this.stdin.resume();
		return this;
	}
	public close(): void {
		this.emit('close');
		this.rl.close();
		this.removeAllListeners();
	}

	public get cursor(): number {
		return this.readline.cursor;
	}
	public hideCursor(): void {
		if (this._renderer) return this._renderer.hideCursor();
		this.stdout.write(cursor.show);
	}
	public showCursor(): void {
		if (this._renderer) return this._renderer.showCursor();
		this.stdout.write(cursor.show);
	}

	public get value(): string {
		return this.readline.line;
	}
	public set value(newVal: string) {
		this.readline.line = newVal;
		this.readline.cursor = this.value.length;
		this.emit('change', newVal);
	}
	public reset(): void {
		this.value = '';
	}
	public get inputLen(): number {
		return this.value.length;
	}

	public get readline(): Interface {
		return this.rl;
	}

	public ding(): void {
		this.stdout.write(beep);
	}

	public registerRenderer(newRenderer: Renderer) {
		this._renderer = newRenderer;
	}

	private processValidInputs(inputs: IValidInputs, type: ProcInputType): void {
		const curInputs = type === ProcInputType.replace || !this.validInput ? [] : this.validInput;
		const procInputs = inputs instanceof Array ? inputs : [inputs];
		for (const inp of procInputs) {
			if (inp instanceof RegExp || typeof inp === 'number') {
				curInputs.push((inp as any));
			} else if (inp instanceof Array && inp.length === 2) {
				let thisInp: [number, number] | undefined;
				if (inp.every((val: any) => typeof val === 'string')) {
					thisInp = ((inp as [string, string]).map((val) => val.charCodeAt(0)) as [number, number]);
				} else if (inp.every((val: any) => typeof val === 'number')) {
					thisInp = (inp as [number, number]);
				}
				if (thisInp) curInputs.push(thisInp);
			} else if (typeof inp === 'string') {
				curInputs.push(inp.charCodeAt(0));
			}
		}
	}
	private processFilterKeys(keys: IFilterKeys, type: ProcInputType): void {
		const curKeys = type === ProcInputType.replace || !this.filterKeys ? [] : this.filterKeys;
		const procKeys = keys instanceof Array ? keys : [keys];
		for (const key of procKeys) {
			if (key instanceof RegExp) {
				curKeys.push(key);
			} else if (typeof key === 'string') {
				curKeys.push(isPrintable(key) ? { name: key } : { sequence: key })
			} else if (typeof key === 'object') {
				curKeys.push(key);
			}
		}
	}

	private isValidInput(chr?: string): boolean {
		if (!this.validInput || chr === undefined) return true;
		const code = chr.charCodeAt(0);
		for (const inputCheck of this.validInput) {
			if (inputCheck instanceof RegExp && inputCheck.test(chr)) return true;
			if (inputCheck instanceof Array) {
				if (code >= inputCheck[0] && code <= inputCheck[1]) return true;
			}
			if (typeof inputCheck === 'number' && code === inputCheck) return true;
		}
		return false;
	}
	private isFilteredInput(key: Key): boolean {
		if (!this.filterKeys) return false;
		const altKeys = ['ctrl', 'meta', 'shift'];
		for (const keyCheck of this.filterKeys) {
			if (keyCheck instanceof RegExp) {
				if (key.sequence && keyCheck.test(key.sequence)) return true;
			} else {
				if (keyCheck.sequence && key.sequence && key.sequence === keyCheck.sequence) return true;
				if (keyCheck.name && key.name && key.name === keyCheck.name) {
					if (altKeys.every((prop) => !!(keyCheck as any)[prop] === !!(key as any)[prop]))
						return true;
				}
			}
		}
		return true;
	}

	//#region ReadableStream interface compliance
	public get readable(): boolean {
		return this._paused;
	}
	public read(): string {
		this.resume();
		return this.value;
	}
	public setEncoding(encoding: string): this {
		return this;
	}
	public isPaused(): boolean {
		return this._paused;
	}
	public pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean; }): T {
		throw new Error('Stream pipes are not supported');
	}
	public unpipe(destination?: NodeJS.WritableStream): this {
		throw new Error('Stream pipes are not supported');
	}
	public unshift(chunk: string | Uint8Array, encoding?: BufferEncoding): void {

	}
	public wrap(oldStream: NodeJS.ReadableStream): this {
		return this;
	}
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
	public [Symbol.asyncIterator](): AsyncIterableIterator<string | Buffer> {
		return this.readline[Symbol.asyncIterator]();
	}
	//#endregion
}

export default InputHandler;
