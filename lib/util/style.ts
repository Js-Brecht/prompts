import c from 'kleur';
import figures from './figures';

export interface IStyle {
	scale: number;
	render: (input: string) => string;
}
export interface IStyles {
	password: IStyle;
	emoji: IStyle;
	invisible: IStyle;
	default: IStyle;
}

// rendering user input.
export const styles: Readonly<IStyles> = Object.freeze({
  password: { scale: 1, render: input => '*'.repeat(input.length) },
  emoji: { scale: 2, render: input => '😃'.repeat(input.length) },
  invisible: { scale: 0, render: input => '' },
  default: { scale: 1, render: input => `${input}` }
});
export const render = (type?: keyof IStyles) => type && styles[type] || styles.default;

export interface ISymbols {
	aborted: string;
	done: string;
	default: string;
}

// icon to signalize a prompt.
export const symbols: Readonly<ISymbols> = Object.freeze({
  aborted: c.red(figures.cross),
  done: c.green(figures.tick),
  default: c.cyan('?')
});

export const symbol = (done: boolean, aborted: boolean): string =>
  aborted ? symbols.aborted : done ? symbols.done : symbols.default;

// between the question and the user's input.
export const delimiter = (completing: boolean) =>
  c.gray(completing ? figures.ellipsis : figures.pointerSmall);

export const item = (expandable: boolean, expanded: boolean) =>
  c.gray(expandable ? (expanded ? figures.pointerSmall : '+') : figures.line);
