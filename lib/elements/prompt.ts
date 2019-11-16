import { EventEmitter } from 'events';
import { Key } from 'readline';
import { beep, cursor } from 'sisteransi';
import color from 'kleur';
import { action, hasKey } from '../util';
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
export abstract class Prompt extends EventEmitter {
	protected readonly inputHandler: InputHandler;
	protected firstRender = true;
	protected out: NodeJS.WriteStream;
	protected aborted?: boolean;
	protected closed?: boolean;
	protected value?: string;

	protected constructor(opts?: IPromptOpts) {
		super();

		this.inputHandler = new InputHandler(opts?.stdin || process.stdin);
		this.out = opts?.stdout || process.stdout;

		this.onKeypress = this.onKeypress.bind(this);
		this.close = this.close.bind(this);
		this.inputHandler.on('keypress', this.onKeypress);
	}

	protected onKeypress(str: string, key: Key) {
		const isSelect = ['SelectPrompt', 'MultiselectPrompt'].indexOf(this.constructor.name) > -1;
		let a = action(key, isSelect);
		if (a === false) {
			this._ && this._(str === undefined ? `` : str, key);
		} else if (typeof a === 'string' && hasKey(this, a)) {
			if (typeof this[a] === 'function')
				this[a](key);
		}
	}
	protected close(): void {
		this.inputHandler.showCursor();
		this.inputHandler.removeListener('keypress', this.onKeypress);
		this.inputHandler.close();
		this.emit(this.aborted ? 'abort' : 'submit', this.value);
		this.closed = true;
	}

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
