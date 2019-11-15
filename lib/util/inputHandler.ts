import { Key, Interface, createInterface, emitKeypressEvents } from 'readline';
// import { ReadStream } from 'tty';
import { Readable } from 'stream';
import { EventEmitter } from 'events';
import { Renderer } from './renderer';
import { beep, cursor } from 'sisteransi';
type IInputTypes = string | number | [string, string] | [number, number] | RegExp;
type IValidInputs = IInputTypes | IInputTypes[];
type IFilterKeyTypes = string | Key | RegExp;
type IFilterKeys = IFilterKeyTypes | IFilterKeyTypes[];

interface IInputHandlerOpts {
	validInputs: IValidInputs;
	filterKeys: IFilterKeys;
}

enum ProcInputType {
	append = 'append',
	replace = 'replace',
}

const KEYPRESS_DECODER = Symbol('keypress-decoder');
const kLineObjectStream = Symbol('line object stream');

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
	private readonly [KEYPRESS_DECODER] = () => void 0;
	private readonly [kLineObjectStream] = new Readable();
	public readonly [Symbol.asyncIterator] = () => this[kLineObjectStream][Symbol.asyncIterator]();

	private _paused: boolean = false;
	private _trackInput: boolean = false;
	private _renderer?: Renderer;
	private _cursor: number = 0;
	private _value: string = '';

	private validInput?: ([number, number] | number | RegExp)[];
	private filterKeys?: (Key | RegExp)[];
	public constructor(opts: IInputHandlerOpts) {
		// super((process.stdin as any).fd);
		super();

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

		this.rl.once('close', () => {
			this.stdin.setRawMode(wasRaw);
			this.stdin.removeListener('keypress', this.handleKeypress);
		});

	}

	public get cursor(): number { return this._cursor; }
	private cursorCheck(x: number): number {
		if (x < 0) return 0;
		if (x > this.inputLen) return this.inputLen;
		return x;
	}
	private moveCursor(x: number): void {
		this._cursor = this.cursorCheck(x);
	}
	private shiftCursor(dx: number): void {
		this._cursor = this.cursorCheck(this.cursor + dx);
		if (this._renderer) this._renderer.restoreCursor();
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
		return this._value;
	}
	public get inputLen(): number {
		return this._value.length;
	}
	public reset(): void {
		this.setValue('');
	}
	public setValue(newVal: string): void {
		this._value = newVal;
		this.moveCursor(this._value.length);
	}

	private handleKeypress(chr: any, key: Key): void {
		if (this._paused) return;
		let emitKeypress = true;
		if (this.validInput && isPrintable(key.sequence)) {
			emitKeypress = this.isValidInput(key.sequence);
		}
		if (emitKeypress && this.filterKeys) {
			emitKeypress = !this.isFilteredInput(key);
		}
		if (emitKeypress) {
			if (this.trackInput) {
				let reRender = true;
				switch (key.name) {
					case 'backspace': {
						if (this.cursor === 0) return;
						if (this.cursor > 0) {
							const pre = this._value.slice(0, this.cursor - 1);
							const suf = this._value.slice(this.cursor);
							this._value = `${pre}${suf}`;
						}
						this.shiftCursor(-1);
						break;
					}
					case 'delete': {
						if (this.cursor >= this.inputLen) return;
						const pre = this._value.slice(0, this.cursor);
						const suf = this._value.slice(this.cursor + 1);
						this._value = `${pre}${suf}`;
						break;
					}
					case 'left': { this.shiftCursor(-1); break; }
					case 'right': { this.shiftCursor(+1); break; }
					case 'home': { this.moveCursor(0); break; }
					case 'end': { this.moveCursor(this.inputLen); break; }
					default: {
						if (chr && isPrintable(key.sequence)) {
							if (this.cursor === this.inputLen) {
								this._value += chr
							} else {
								const pre = this._value.slice(0, this.cursor);
								const suf = this._value.slice(this.cursor);
								this._value = `${pre}${chr}${suf}`
							}
							this.shiftCursor(1);
						} else {
							reRender = false;
						}
					}
				}
			}
			this.emit('keypress', chr, key);
		} else {
			this.ding();
		}
	}

	public get readline(): Interface {
		return this.rl;
	}

	public ding(): void {
		this.stdout.write(beep);
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

	public get trackInput(): boolean {
		return this._trackInput;
	}
	public set trackInput(track: boolean) {
		this._trackInput = track;
	}
	public registerRenderer(newRenderer: Renderer) {
		this.trackInput = true;
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
		for (const keyCheck of this.filterKeys) {
			if (keyCheck instanceof RegExp) {
				if (key.sequence && keyCheck.test(key.sequence)) return true;
			} else {
				if (keyCheck.sequence && key.sequence && key.sequence === keyCheck.sequence) return true;
				if (keyCheck.name && key.name && key.name === keyCheck.name) {
					if (['ctrl', 'meta', 'shift'].every((prop) => !!(keyCheck as any)[prop] === !!(key as any)[prop]))
						return true;
				}
			}
		}
		return true;
	}


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
	// public [Symbol.asyncIterator](): AsyncIterableIterator<string | Buffer> {

	// }
}

