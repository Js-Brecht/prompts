const color = require('kleur');
const Prompt = require('./prompt');
const { erase, cursor } = require('sisteransi');
const { style, clear, lines, figures } = require('../util');

/**
 * TextPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {String} [opts.style='default'] Render style
 * @param {String} [opts.initial] Default value
 * @param {Function} [opts.validate] Validate function
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {String} [opts.error] The invalid error label
 */
class TextPrompt extends Prompt {
  constructor(opts={}) {
    super(opts);
    this.transform = style.render(opts.style);
    this.scale = this.transform.scale;
    this.msg = opts.message;
    this.initial = opts.initial || ``;
    this.hint = opts.hint || ``;
    this.validator = opts.validate || (() => true);
    this.value = ``;
    this.errorMsg = opts.error || `Please Enter A Valid Value`;
    this.cursor = Number(!!this.initial);
    this.clear = clear(``);
    this.render();
  }

  set value(v) {
    if (!v && this.initial) {
      this.placeholder = true;
      this.rendered = color.gray(this.transform.render(this.initial));
    } else {
      this.placeholder = false;
      this.rendered = this.transform.render(v);
    }
    this._value = v;
    this.fire();
  }

  get value() {
    return this._value;
  }

  reset() {
    this.value = ``;
    this.cursor = Number(!!this.initial);
    this.fire();
    this.render();
  }

  abort() {
    this.value = this.value || this.initial;
    this.done = this.aborted = true;
    this.error = false;
    this.red = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  async validate() {
    let valid = await this.validator(this.value);
    if (typeof valid === `string`) {
      this.errorMsg = valid;
      valid = false;
    }
    this.error = !valid;
  }

  async submit() {
    this.value = this.value || this.initial;
    await this.validate();
    if (this.error) {
      this.red = true;
      this.fire();
      this.render();
      return;
    }
    this.done = true;
    this.aborted = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  next() {
    if (!this.placeholder) return this.bell();
    this.value = this.initial;
    this.cursor = this.rendered.length;
    this.fire();
    this.render();
  }

  moveCursor(n) {
    if (this.placeholder) return;
    this.cursor = this.cursor+n;
  }

  _(c, key) {
    let s1 = this.value.slice(0, this.cursor);
    let s2 = this.value.slice(this.cursor);
    this.value = `${s1}${c}${s2}`;
    this.red = false;
    this.cursor = this.placeholder ? 0 : s1.length+1;
    this.render();
  }

  delete() {
    if (this.cursor === 0) return this.bell();
    let s1 = this.value.slice(0, this.cursor-1);
    let s2 = this.value.slice(this.cursor);
    this.value = `${s1}${s2}`;
    this.red = false;
    this.moveCursor(-1);
    this.render();
  }

  deleteForward() {
    if(this.cursor*this.scale >= this.rendered.length || this.placeholder) return this.bell();
    let s1 = this.value.slice(0, this.cursor);
    let s2 = this.value.slice(this.cursor+1);
    this.value = `${s1}${s2}`;
    this.red = false;
    this.render();
  }

  first() {
    this.cursor = 0;
    this.render();
  }

  last() {
    this.cursor = this.value.length;
    this.render();
  }

  left() {
    if (this.cursor <= 0 || this.placeholder) return this.bell();
    this.moveCursor(-1);
    this.render();
  }

  right() {
    if (this.cursor*this.scale >= this.rendered.length || this.placeholder) return this.bell();
    this.moveCursor(1);
    this.render();
  }

  render() {
    if (this.closed) return;
    if (!this.firstRender) {
      if (this.postMessage)
        this.out.write(cursor.down(lines(this.postMessage) - 1) + clear(this.postMessage));
      this.out.write(clear(this.outputPrompt + this.outputText));
    } else {
      this.out.write('\n' + cursor.up(1));
    }
    super.render();
    this.postMessage = ``;

    this.outputPrompt = [
      style.symbol(this.done, this.aborted),
      color.bold(this.msg),
      style.delimiter(this.done) + ` `,
    ].join(` `);
    this.outputText = this.red ? color.red(this.rendered) : this.rendered;

    // let outputLength = (
    //   /* symbol length */
    //   2 +
    //   /* prompt */
    //   this.msg.length +
    //   /* delimiter */
    //   3 +
    //   /* input */
    //   this.value.length
    // )
    // const curRowLength = outputLength -
    // /* Subtract the total number of characters that span the number rows wrapped from the current length */
    // (this.out.columns * Math.floor(outputLength / this.out.columns));
    // /* This output wrap.  We need to recalculate the cursor position */
    // if (outputLength > this.out.columns) outputLength = curRowLength;

    if (this.error || this.hint) {
      this.postMessage = (this.error ? this.errorMsg : this.hint).split(`\n`)
        .reduce((a, l, i) => a + `\n${i ? ' ' : figures.pointerSmall} ${this.error ? color.red().italic(l) : color.gray().italic(l)}`, ``)
      if (this.hint) this.error = false;
    }

    this.out.write(
      cursor.to(0) +
      this.outputPrompt + (this.placeholder ? cursor.save : ``) +
      erase.lineEnd +
      this.outputText + (!this.placeholder ? cursor.save : ``)
    );
    if (this.postMessage) {
      this.out.write(this.postMessage + cursor.up(lines(this.postMessage)))
    }
    this.out.write(cursor.restore);
  }
}

module.exports = TextPrompt;
