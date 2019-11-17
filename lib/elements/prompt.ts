import { EventEmitter } from 'events';
import { Key } from 'readline';
import { beep, cursor } from 'sisteransi';
import color from 'kleur';
import { InputHandler } from 'readline-promptx';
import { action, hasKey } from '../util';
import { IPromptOpts, IOnRenderFn, PromptActions } from '../interface';


/**
 * Base prompt skeleton
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */
export class Prompt extends EventEmitter {
	protected readonly inputHandler: InputHandler;
	protected firstRender = true;
	protected out: NodeJS.WriteStream;
	protected aborted?: boolean;
	protected closed?: boolean;
	protected value?: string;

	private onRender: IOnRenderFn;

	protected constructor(opts?: IPromptOpts) {
		super();

		this.inputHandler = new InputHandler(opts?.stdin || process.stdin);
		this.out = opts?.stdout || process.stdout;
		this.onRender = (opts?.onRender || (() => void 0)).bind(this);

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
			let fn = this[a];
			if (typeof fn === 'function')
				fn(key);
		}
	}
	protected close(): void {
		this.inputHandler.showCursor();
		this.inputHandler.removeListener('keypress', this.onKeypress);
		this.inputHandler.close();
		this.emit(this.aborted ? 'abort' : 'submit', this.value);
		this.closed = true;
	}

	protected fire(): void {
		this.emit('state', {
			value: this.value,
			aborted: !!this.aborted,
		});
	}

	protected bell(): void {
		this.out.write(beep);
	}

	render() {
		this.onRender(color);
		if (this.firstRender) this.firstRender = false;
	}
}

export default Prompt;
