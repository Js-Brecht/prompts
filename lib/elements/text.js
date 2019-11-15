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
  constructor(opts = {}) {
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
    this.renderer = new Renderer(this.inputHandler);

    this.onChange = this.onChange.bind(this);
    this.inputHandler.on('change', this.onChange);

    this.refresh(this.inputHandler.value);
  }

  onChange(val) {
    this.refresh(val);
  }

  refresh(val) {
    if (!val && this.initial) {
      this.placeholder = true;
      this.rendered = color.gray(this.transform.render(this.initial));
    } else {
      this.placeholder = false;
      this.rendered = this.transform.render(val);
    }
    this.fire();
    this.render();
    if (this.red) this.red = false;
  }

  reset() {
    this.inputHandler.reset();
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
    this.value = this.inputHandler.value || this.initial;
    await this.validate();
    if (this.error) {
      this.red = true;
      this.refresh(this.value);
      return;
    }
    this.done = true;
    this.aborted = false;
    this.refresh(this.value);
    this.out.write('\n');
    this.close();
  }

  abort() {
    this.value = this.inputHandler.value || this.initial;
    this.done = this.aborted = true;
    this.error = false;
    this.red = false;
    this.refresh(this.value);
    this.out.write('\n' + erase.down());
    this.close();
  }

  next() {
    if (!this.placeholder) return;
    this.inputHandler.value = this.initial;
  }

  render() {
    if (this.closed) return;

    super.render();
    this.postMessage = ``;

    this.outputPrompt = [[
      style.symbol(this.done, this.aborted),
      this.msg.split(`\n`).map((l) => color.bold(l)).join(`\n`),
      style.delimiter(this.done),
      (this.placeholder ? cursor.save : ``) +
      (this.red ? color.red(this.rendered) : this.rendered) +
      (!this.placeholder ? cursor.save : ``)
    ].join(` `)];

    if (this.error || this.hint) {
      this.postMessage = this.error ? this.errorMsg : this.hint;
      this.outputPrompt.push(this.postMessage.split(`\n`)
        .map((l, i) => `${i > 0 ? ' ' : figures.pointerSmall} ${this.error ? color.red().italic(l) : color.gray().italic(l)}` + erase.lineEnd)
      );
      if (this.hint) this.error = false;
    }

    this.renderer.print(this.outputPrompt.join(`\n`));
  }
}

module.exports = TextPrompt;
