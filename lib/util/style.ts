import c from 'kleur';
import figures from './figures';

// rendering user input.
export const styles = Object.freeze({
  password: { scale: 1, render: input => '*'.repeat(input.length) },
  emoji: { scale: 2, render: input => '😃'.repeat(input.length) },
  invisible: { scale: 0, render: input => '' },
  default: { scale: 1, render: input => `${input}` }
});
export const render = type => styles[type] || styles.default;

// icon to signalize a prompt.
export const symbols = Object.freeze({
  aborted: c.red(figures.cross),
  done: c.green(figures.tick),
  default: c.cyan('?')
});

export const symbol = (done, aborted) =>
  aborted ? symbols.aborted : done ? symbols.done : symbols.default;

// between the question and the user's input.
export const delimiter = completing =>
  c.gray(completing ? figures.ellipsis : figures.pointerSmall);

export const item = (expandable, expanded) =>
  c.gray(expandable ? (expanded ? figures.pointerSmall : '+') : figures.line);
