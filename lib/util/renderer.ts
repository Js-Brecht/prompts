import { Interface, Key } from 'readline';
import { lines, lastRowCol } from './lines';
import { cursor, erase } from 'sisteransi';

declare module 'sisteransi' {
	export namespace cursor {
		export function to(x: number, y?: number): void;
	}
}

type IPlainState = [number, string];
type IRenderState = string;
interface IState {
	virtualRows: number;
	actualRows: number;
	plain: IPlainState[];
	render: IRenderState[];
}
interface IInputPos {
	X: number;
	Y: number;
	offsetY: number;
	offsetX: number;
}
interface IStdio {
	stdin: NodeJS.ReadStream;
	stdout: NodeJS.WriteStream;
}

const getEmptyState = (): IState => {
	return {
		actualRows: 0,
		virtualRows: -1,
		plain: [],
		render: [],
	}
}

const escPattern = /((?:\u001b|\u009b)(?:\[[0-9;]*[A-Zsum~]|[0-9]))/;
export class Renderer {
	/**
	 * If defined, then this renderer will track certain events on stdin
	 * It should have already been initialized elsewhere.
	 */
	private rlInterface?: Interface;
	private in: NodeJS.ReadStream;
	private out: NodeJS.WriteStream;
	/**
	 * Determines whether or not the cursor will be tracked automatically.
	 * If a readline interface is provided, then this will be set to true.
	 * If set to true, `cursor.save` events after the first one will be ignored.
	 */
	private autoCursor: boolean = false;
	/** Tracks whether this has rendered for the first time */
	private firstRender: boolean = true;
	/** Tracks where the cursor lands in the user input */
	private _cursor = 0;
	/** Tracks how many rows the cursor will need to be moved when a line is rendered */
	private virtOffset?: number;
	/**
	 * The actual offset of the cursor at any given time
	 * This gets set in a couple of ways:
	 * * It's updated when a key is pressed that will change the cursor position
	 * in the input string
	 * * It's set to the inputPos.offsetY when `print()` is called
	 * * When lines are rendered, it is updated to the last row of the last line
	 * rendered
	 */
	private cursorOffset: number = 0;
	private inputPos: IInputPos = { X: 0, Y: 0, offsetX: 0, offsetY: 0 };
	private inputLen: number = 0;

	private prevState: IState = getEmptyState();
	private curState: IState = getEmptyState();
	private drawAll: boolean = false;

	public constructor(stdio?: IStdio);
	public constructor(stdio?: IStdio, rl?: Interface);
	public constructor(stdio: IStdio = { stdin: process.stdin, stdout: process.stdout }, rl?: Interface) {
		this.in = stdio.stdin;
		this.out = stdio.stdout;
		this.rlInterface = rl;

		this.autoCursor = this.rlInterface !== undefined;
		this.handleKeypress = this.handleKeypress.bind(this);
		if (this.rlInterface) {
			this.in.on('keypress', this.handleKeypress);
			this.rlInterface.on('close', () => {
				this.in.removeListener('keypress', this.handleKeypress);
			})
		}
	}

	public get cursor(): number { return this._cursor; }
	public set cursor(x: number) {
		this._cursor = x;
		this.resetInputCursor();
	}

	private calcInputOffset(): void {
		const offsetX = this.inputPos.X + this.cursor;
		this.inputPos.offsetX = lastRowCol(offsetX);
		this.inputPos.offsetY = this.getOffsetFrom0(this.inputPos.Y - 1, offsetX);
		if (this.inputPos.offsetX === this.out.columns) {
			this.inputPos.offsetX = 0;
			this.inputPos.offsetY += 1;
		}
	}
	public resetInputCursor(): void {
		this.calcInputOffset();
		const offset = this.inputPos.offsetY - this.cursorOffset;
		this.out.write(cursor.move(0, offset) + cursor.to(this.inputPos.offsetX));
		this.cursorOffset = this.inputPos.offsetY;
	}
	public moveInputCursor(dx: number) {
		(() => {
			this._cursor += dx;
			if (this._cursor < 0) return this._cursor = 0;
			if (this._cursor > this.inputLen) return this._cursor = this.inputLen;
		})();
		this.resetInputCursor();
	}
	private handleKeypress(data: any, key: Key) {
		switch (key.name) {
			case 'backspace':
			case 'left': {this.moveInputCursor(-1); break;}
			case 'right': {this.moveInputCursor(+1); break;}
			case 'home': {this._cursor = 0; break;}
			case 'end': {this._cursor = this.inputLen; break;}
			default: {
				if (key.sequence) {
					const keyCode = key.sequence.charCodeAt(0);
					if (keyCode >= 32 && keyCode <= 126) {
						this._cursor += 1;
						this.calcInputOffset();
						this.resetInputCursor();
					}
				}
			}
		}
	}

	/**
	 * Determines how many ACTUAL rows from the origin row (0 index) the desired
	 * index is, includes line wrapping
	 * @param idx The index of the current state to calculate offset for
	 */
	private getOffsetFrom0(idx: number, countOutput?: string | number): number {
		let offset = 0;
		if (this.curState && this.curState.plain.length > 0) {
			const plainState = this.curState.plain;
			if (idx > plainState.length - 1) idx = plainState.length - 1
			for (let x = 0; x <= idx; ++x) {
				offset += this.curState.plain[x][0];
			}
		}
		if (countOutput) offset += (lines(countOutput) - 1);
		return offset;
	}

	/**
	 * This will drop the cursor down to the last row, last column, of the
	 * output, and then issue a CLEAR-END-OF-SCREEN ANSI code.
	 * @param cursorOffset Where the cursor current resides, in comparison
	 * to the 0-index row position of the output.
	 */
	private clearAfterEnd(cursorOffset: number): void {
		const lastIdx = this.curState.virtualRows;
		const lastRow = this.curState.actualRows;
		const lastLineCol = lastRowCol(this.curState.plain[lastIdx][1].length);
		const offset = lastRow - cursorOffset;
		this.out.write(cursor.move(0, offset) + cursor.to(lastLineCol) + erase.down(1));
	}

	public print(data: string) {
		const renderLines = data.split('\n');
		this.curState = getEmptyState();
		this.cursorOffset = this.inputPos.offsetY;
    for (const [idx, ln] of renderLines.entries()) {
      let procText = ln;
      let matched: RegExpExecArray | null;
      let rendered: IRenderState = '';
			let plain: IPlainState = [1, ''];
      // Parse the ANSI codes on each line of input
      while (null !== (matched = escPattern.exec(procText))) {
        const ansiCode = matched[0];
        const terminator = ansiCode[ansiCode.length - 1];
        const startIdx = matched.index;
        const endIdx = startIdx + ansiCode.length;
          if (startIdx > 0) {
            const procTextSect = procText.slice(0, startIdx);
            plain[1] += procTextSect
            rendered += procTextSect;
          }
          // Only allow ANSI style codes to feed into the output
          if (terminator === 'm') rendered += ansiCode;
          // Process cursor input position
          if (terminator === '7' || terminator === 's') {
						if (!this.autoCursor || this.firstRender) {
							this.inputPos = {
								X: plain[1].length,
								Y: idx,
								offsetX: 0,
								offsetY: 0
							}
						} else {
							this.inputLen = plain[1].length - this.inputPos.X;
						}
          }
          procText = procText.slice(endIdx);
			}
			plain[1] += procText;
			plain[0] = lines(plain[1]);
			rendered += procText;
			this.curState.plain[idx] = plain;
			this.curState.render[idx] = rendered;
			this.curState.virtualRows += 1;
			this.curState.actualRows += plain[0];

			this.sprintf(plain, rendered, renderLines.length);
		}
		// Clear to the end of the screen, if we haven't rendered
		// past the end of the previous output
		if (this.curState.actualRows < this.prevState.actualRows)
			this.clearAfterEnd(this.cursorOffset);

		// Reset the input cursor to where it needs to be
		this.resetInputCursor();

		// Reset some variables for next run
		this.firstRender = false;
		this.prevState = this.curState;
		this.virtOffset = undefined;
	}

	/**
	 * Spool Print Formatted - Spool output into state, and selectively draw formatted
	 * output to screen.
	 * @param {IPlainState} plain The plain text representation of the rendered output
	 * @param {IRenderState} render The
	 * @param {number} maxLines
	 */
	private sprintf(plain: IPlainState, render: IRenderState, maxLines: number) {
		const idx = this.curState.virtualRows;
		if (this.inputPos.Y === idx) this.calcInputOffset();
		if (this.virtOffset === undefined) this.virtOffset = -this.inputPos.offsetY;

		if (this.prevState.plain[idx] && this.prevState.plain[idx][0] !== plain[0])
			this.drawAll = true;
		let drawLine = this.drawAll ||
			idx > this.prevState.virtualRows ||
			this.prevState.render[idx] !== render;
		if (drawLine) {
			const lastRowLen = lastRowCol(plain[1].length)
			const addLine = idx > this.prevState.virtualRows && idx < maxLines;
			this.out.write(
				cursor.move(0, this.virtOffset) + cursor.to(0) +
				render +
				(lastRowLen === this.out.columns ? `\n` : ``) +
				erase.lineEnd +
				(addLine ? `\n` : ``)
			);
			// Move cursorOffset to match where the virtual Offset will cause drawing to happen
			if (this.virtOffset !== 0) this.cursorOffset += this.virtOffset;
			// Account for extra rows, due to wrapping, in the output
			this.cursorOffset += plain[0] - 1;
			// Account for a new line at the end
			if (addLine) this.cursorOffset += 1;
			this.virtOffset = 0;
		} else {
			this.virtOffset += plain[0];
		}
	}

}
