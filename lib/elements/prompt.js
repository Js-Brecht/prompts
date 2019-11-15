'use strict';

const readline = require('readline');
const EventEmitter = require('events');
const { beep, cursor } = require('sisteransi');
const color = require('kleur');
const { action, InputHandler } = require('../util');

/**
 * Base prompt skeleton
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */
class Prompt extends EventEmitter {
  constructor(opts={}) {
    super();

    this.firstRender = true;
    this.inputHandler = new InputHandler(opts.stdin || process.stdin);
    this.out = opts.stdout || process.stdout;
    this.onRender = (opts.onRender || (() => void 0)).bind(this);

    const isSelect = [ 'SelectPrompt', 'MultiselectPrompt' ].indexOf(this.constructor.name) > -1;
    const keypress = (str, key) => {
      let a = action(key, isSelect);
      if (a === false) {
        this._ && this._(str === undefined ? `` : str, key);
      } else if (typeof this[a] === 'function') {
        this[a](key);
      }
    };

    this.close = () => {
      this.inputHandler.showCursor();
      this.inputHandler.removeListener('keypress', keypress);
      this.inputHandler.close();
      this.emit(this.aborted ? 'abort' : 'submit', this.value);
      this.closed = true;
    };

    this.inputHandler.on('keypress', keypress);

  }

  fire() {
    this.emit('state', {
      value: this.value,
      aborted: !!this.aborted
    });
  }

  bell() {
    this.out.write(beep);
  }

  render() {
    this.onRender(color);
    if (this.firstRender) this.firstRender = false;
  }
}

module.exports = Prompt;
