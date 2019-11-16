import { InputHandler } from './inputHandler';
declare module 'sisteransi' {
    namespace cursor {
        function to(x: number, y?: number): void;
    }
}
export declare class Renderer {
    /**
     * If defined, then this renderer will track certain events on stdin
     * It should have already been initialized elsewhere.
     */
    private inputHandler?;
    private out;
    /** Tracks whether this has rendered for the first time */
    private firstRender;
    /** Tracks how many rows the cursor will need to be moved from its current position
     *  when a line is rendered */
    private moveOffset?;
    /**
     * The actual offset of the cursor, in relation to 0-index, at any given time
     * This gets set in a couple of ways:
     * * It's set to the inputPos.offsetY when `print()` is called
     * * As lines are rendered, it is updated to the last row of the last line
     * rendered
     * * When the cursor position is "restored" (cursor moved to where it needs to appear
     * in the input), this is set to the inputPos.offsetY.
     */
    private cursorOffset;
    private cursorVisible;
    /** Tracks where the input line lands in comparison to the 0-index of the output */
    private inputPos;
    /** Keeps track of what the last render looked like */
    private prevState;
    /** Tracks the current rendering process */
    private curState;
    /** Gets set when the currow row down (of the current render state) needs to be drawn
     * This can happen in a few instances:
     * * When it's the first render
     * * When the currently rendering row exceeds the number of previously rendered rows
     * * When the number of drawn rows (includes wrapped lines) has changed
     * * When the input line has wrapped (number of drawn rows has changed).
     */
    private drawAll;
    constructor(inputHandler?: InputHandler);
    get cursor(): number;
    hideCursor(): void;
    showCursor(): void;
    private get screenWidth();
    private calcInputOffset;
    restoreCursor(): void;
    /**
     * Determines how many ACTUAL rows from the origin row (0 index) the desired
     * index is, includes line wrapping
     * @param idx The index of the current state to calculate offset for
     */
    private getOffsetFrom0;
    /**
     * This will drop the cursor down to the last row, last column, of the
     * output, and then issue a CLEAR-END-OF-SCREEN ANSI code.
     */
    private clearAfterEnd;
    print(data: string): void;
    /**
     * Spool Print Formatted - Spool output into state, and selectively draw formatted
     * output to screen.
     * @param {IPlainState} plain The plain text representation of the rendered output
     * @param {IRenderState} render The
     * @param {number} maxLines
     */
    private sprintf;
}
export default Renderer;
