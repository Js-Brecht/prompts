'use strict';

const readline = require('readline');
const { action, lines } = require('../util');
const EventEmitter = require('events');
const { beep, cursor } = require('sisteransi');
const color = require('kleur');

const escPattern = /(\u001b|\u009b)(\[[0-9;]*[A-Zsum~]|[0-9])/;

/**
 * Base prompt skeleton
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */
class Prompt extends EventEmitter {
  constructor(opts={}) {
    super();

    this.firstRender = true;
    this.in = opts.stdin || process.stdin;
    this.out = opts.stdout || process.stdout;
    this.onRender = (opts.onRender || (() => void 0)).bind(this);
    const rl = readline.createInterface(this.in);
    readline.emitKeypressEvents(this.in, rl);

    if (this.in.isTTY) this.in.setRawMode(true);
    const isSelect = [ 'SelectPrompt', 'MultiselectPrompt' ].indexOf(this.constructor.name) > -1;
    const keypress = (str, key) => {
      let a = action(key, isSelect);
      if (a === false) {
        this._ && this._(str === undefined ? `` : str, key);
      } else if (typeof this[a] === 'function') {
        this[a](key);
      } else {
        this.bell();
      }
    };

    this.close = () => {
      this.out.write(cursor.show);
      this.in.removeListener('keypress', keypress);
      if (this.in.isTTY) this.in.setRawMode(false);
      rl.close();
      this.emit(this.aborted ? 'abort' : 'submit', this.value);
      this.closed = true;
    };

    this.in.on('keypress', keypress);
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

  prints(data) {
    const rendered = [];
    const plain = [];
    for (const [idx, ln] of data.split('\n').entries()) {
      let procText = ln;
      let matched;
      plain[idx] = [1, ''];
      while (matched = escPattern.exec(procText)) {
        const ansiCode = matched[0];
        const terminator = ansiCode[ansiCode.length - 1];
        const startIdx = matched.index;
        const endIdx = startIdx + ansiCode.length;
          if (startIdx > 0) {
            const procTextSect = procText.slice(0, startIdx);
            plain[idx][1] += procTextSect
            rendered[idx] += procTextSect;
          }
          if (terminator === 'm') rendered[idx] += ansiCode;
          procText = procText.slice(endIdx);
      }
      plain[idx][0] = lines(plain[idx][1]);
    }
  }
}

module.exports = Prompt;
