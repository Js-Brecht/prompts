const color = require('kleur');
const Prompt = require('./prompt');
const { erase, cursor } = require('sisteransi');
const { style, clear, lines, figures, strip, Renderer } = require('../util');

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
    this.clear = clear(``);
    this.renderer = new Renderer({ stdin: this.in, stdout: this.out }, this.rl);
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
    this.cursor = 0;
    this.fire();
    this.render();
  }

  get cursor() {
    return this.renderer.cursor;
  }
  set cursor(val) {
    this.renderer.cursor = val;
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
    this.rendered.cursor = this.rendered.length;
    this.fire();
    this.render();
  }

  // moveCursor(n) {
  //   if (this.placeholder) return;
  //   this.cursor = this.cursor+n;
  // }

  _(c, key) {
    if (this.cursor === this.value.length) {
      this.value += c;
    } else {
    let s1 = this.value.slice(0, this.cursor);
    let s2 = this.value.slice(this.cursor);
    this.value = `${s1}${c}${s2}`;
    }
    this.red = false;
    this.render();
  }

  delete() {
    if (this.cursor === 0) return this.bell();
    let s1 = this.value.slice(0, this.cursor-1);
    let s2 = this.value.slice(this.cursor);
    this.value = `${s1}${s2}`;
    this.red = false;
    this.render();
  }

  deleteForward() {
    if(this.cursor*this.scale >= this.length || this.placeholder) return this.bell();
    let s1 = this.value.slice(0, this.cursor);
    let s2 = this.value.slice(this.cursor+1);
    this.value = `${s1}${s2}`;
    this.red = false;
    this.render();
  }

  first() {
    // this.cursor = 0;
    // this.render();
  }

  last() {
  //   this.cursor = this.value.length;
  //   this.render();
  }

  left() {
  //   if (this.cursor <= 0 || this.placeholder) return this.bell();
  //   // this.moveCursor(-1);
  //   this.render();
  }

  right() {
  //   if (this.cursor*this.scale >= this.rendered.length || this.placeholder) return this.bell();
  //   // this.moveCursor(1);
  //   this.render();
  }

  render() {
    if (this.closed) return;
    super.render();
    this.postMessage = ``;

    this.outputPrompt = [
      style.symbol(this.done, this.aborted),
      this.msg.split(`\n`).map((l) => color.bold(l)).join(`\n`),
      style.delimiter(this.done),
      (this.placeholder ? cursor.save : ``) +
      (this.red ? color.red(this.rendered) : this.rendered) +
      (!this.placeholder ? cursor.save : ``)
    ].join(` `);

    if (this.error || this.hint) {
      this.postMessage = this.error ? this.errorMsg : this.hint;
      this.postMessage = this.postMessage.split(`\n`)
        .map((l, i) => `${i > 0 ? ' ' : figures.pointerSmall} ${this.error ? color.red().italic(l) : color.gray().italic(l)}` + erase.lineEnd)
        .join(`\n`);
      if (this.hint) this.error = false;
    }

    this.renderer.print(
      this.outputPrompt +
      (this.postMessage ? `\n${this.postMessage}` : ``)
    );
  }
}

module.exports = TextPrompt;
