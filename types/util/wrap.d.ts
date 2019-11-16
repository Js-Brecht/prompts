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
export declare const wrap: (msg: string, opts?: IWrapOptions) => string;
export default wrap;
