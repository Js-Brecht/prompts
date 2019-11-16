export interface IWrapOptions {
	margin?: number | string;
	width?: number;
}

/**
 * @param {string} msg The message to wrap
 * @param {object} [opts]
 * @param {number|string} [opts.margin] Left margin
 * @param {number} [opts.width] Maximum characters per line including the margin
 */
export const wrap = (msg: string, opts: IWrapOptions = {}) => {
  const _opts: Required<IWrapOptions> = {
    margin: 0,
    width: process.stdout.columns,
    ...opts,
  }
  const tab = Number.isSafeInteger(+_opts.margin)
    ? ' '.repeat(+_opts.margin)
    : (_opts.margin as string || '');

  const width = _opts.width;

  return (msg || '').split(/\r?\n/g)
    .map(line => line
      .split(/\s+/g)
      .reduce((arr, w) => {
        if (w.length + tab.length >= width || arr[arr.length - 1].length + w.length + 1 < width)
          arr[arr.length - 1] += ` ${w}`;
        else arr.push(`${tab}${w}`);
        return arr;
      }, [ tab ])
      .join('\n'))
    .join('\n');
};

export default wrap;
