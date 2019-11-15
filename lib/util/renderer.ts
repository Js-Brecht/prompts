import { Interface, Key } from 'readline';
import { cursor, erase } from 'sisteransi';
import { lines, lastRowCol } from './lines';
import { InputHandler } from './inputHandler';

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

// Taken from readline/util; added `s` and `u` (Save/Restore cursor alternates)
const escPattern = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqrsuy=><]/;
// const escPattern = /((?:\u001b|\u009b)(?:\[[0-9;]*[A-Zsum~$^]|[0-9]))/;

export class Renderer {
	/**
	 * If defined, then this renderer will track certain events on stdin
	 * It should have already been initialized elsewhere.
	 */
	private inputHandler?: InputHandler;
	private out: NodeJS.WriteStream = process.stdout;
	/** Tracks whether this has rendered for the first time */
	private firstRender: boolean = true;
	/** Tracks how many rows the cursor will need to be moved from its current position
	 *  when a line is rendered */
	private moveOffset?: number;
	/**
	 * The actual offset of the cursor, in relation to 0-index, at any given time
	 * This gets set in a couple of ways:
	 * * It's set to the inputPos.offsetY when `print()` is called
	 * * As lines are rendered, it is updated to the last row of the last line
	 * rendered
	 * * When the cursor position is "restored" (cursor moved to where it needs to appear
	 * in the input), this is set to the inputPos.offsetY.
	 */
	private cursorOffset: number = 0;
	private cursorVisible: boolean = true;
	/** Tracks where the input line lands in comparison to the 0-index of the output */
	private inputPos: IInputPos = {
		/**
		 * * If cursor is handled automatically, this marks where the cursor was
		 * initially placed on the input row (using `cursor.save`), marking the end
		 * of the prompt and beginning of the input.
		 * * If not, this marks the position of the `cursor.save` character.
		 */
		X: 0,
		/** This marks the which row of the render state the input line lands on */
		Y: 0,
		/**
		 * This indicates what column on the screen the cursor needs to land on to be in the
		 * correct position for input.
		 */
		offsetX: 0,
		/**
		 * This indicates what row, offset from the first output row, the cursor needs to land on
		 * to be in the correct position for input
		 */
		offsetY: 0
	};
	/** Keeps track of what the last render looked like */
	private prevState: IState = getEmptyState();
	/** Tracks the current rendering process */
	private curState: IState = getEmptyState();
	/** Gets set when the currow row down (of the current render state) needs to be drawn
	 * This can happen in a few instances:
	 * * When it's the first render
	 * * When the currently rendering row exceeds the number of previously rendered rows
	 * * When the number of drawn rows (includes wrapped lines) has changed
	 * * When the input line has wrapped (number of drawn rows has changed).
	 */
	private drawAll: boolean = false;

	public constructor(inputHandler?: InputHandler) {
		this.out = process.stdout;
		if (inputHandler) {
			this.inputHandler = inputHandler;
			this.inputHandler.registerRenderer(this);
		}
	}

	public get cursor(): number {
		if (this.inputHandler) return this.inputHandler.cursor;
		return 0;
	}
	public hideCursor(): void {
		this.out.write(cursor.hide);
		this.cursorVisible = false;
	}
	public showCursor(): void {
		this.out.write(cursor.show);
		this.cursorVisible = true;
	}
	private get screenWidth(): number {
		return this.out.columns;
	}

	private calcInputOffset(): void {
		const offsetX = this.inputPos.X + this.cursor;
		this.inputPos.offsetX = lastRowCol(offsetX);
		this.inputPos.offsetY = this.getOffsetFrom0(this.inputPos.Y - 1, offsetX);
		if (this.inputPos.offsetX === this.screenWidth) {
			this.inputPos.offsetX = 0;
			this.inputPos.offsetY += 1;
		}
	}
	public restoreCursor(): void {
		this.calcInputOffset();
		const offset = this.inputPos.offsetY - this.cursorOffset;
		this.out.write(cursor.move(0, offset) + cursor.to(this.inputPos.offsetX));
		this.cursorOffset = this.inputPos.offsetY;
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
	 */
	private clearAfterEnd(): void {
		const lastIdx = this.curState.virtualRows;
		const lastRow = this.curState.actualRows;
		const lastLineCol = lastRowCol(this.curState.plain[lastIdx][1].length);
		// const offset = (lastRow - 1) - this.cursorOffset;
		const offset = this.cursorOffset - (lastRow + 1);
		// if (offset !== 0) this.out.write();
		this.out.write(cursor.move(0, offset) + cursor.to(lastLineCol) + erase.down(1) + '\n');
	}

	public print(data: string) {
		const renderLines = data.split('\n');
		this.curState = getEmptyState();
		this.cursorOffset = this.inputPos.offsetY;

		this.out.write(cursor.hide);
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
					if (!this.inputHandler || this.firstRender) {
						this.inputPos = {
							X: plain[1].length,
							Y: idx,
							offsetX: 0,
							offsetY: 0
						}
					}
				}
				procText = procText.slice(endIdx);
			}
			if (idx === this.inputPos.Y && lastRowCol(plain[1]) === this.screenWidth) {
				procText += `\n`;
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
			this.clearAfterEnd();

		// Reset the input cursor to where it needs to be
		this.restoreCursor();
		if (this.cursorVisible) this.out.write(cursor.show);

		// Reset some variables for next run
		this.firstRender = false;
		this.prevState = this.curState;
		this.moveOffset = undefined;
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
		if (this.moveOffset === undefined) this.moveOffset = -this.inputPos.offsetY;
		if (this.inputPos.Y === idx) this.calcInputOffset();

		if (this.prevState.plain[idx] && this.prevState.plain[idx][0] !== plain[0])
			this.drawAll = true;
		let drawLine = this.drawAll ||
			idx > this.prevState.virtualRows ||
			this.prevState.render[idx] !== render;
		if (drawLine) {
			this.out.write(
				cursor.move(0, this.moveOffset) + cursor.to(0) +
				render +
				erase.lineEnd +
				`\n`
			);
			// Set cursorOffset to match where the moveOffset will cause drawing to occur
			if (this.moveOffset !== 0) this.cursorOffset += this.moveOffset;
			// Account for extra rows, due to wrapping, in the output
			this.cursorOffset += plain[0] - 1;
			// Account for a new line at the end
			this.cursorOffset += 1;
			// If a newline was not added at end of output, then the next time
			// the cursor is moved, the extra line down should be accounted for
			this.moveOffset = 0;
		} else {
			// Track the number of output rows the cursor will need to be moved to draw
			// the next line that needs to render
			this.moveOffset += plain[0];
		}
	}

}

export default Renderer;
