'use strict';

const readline = require('readline');
const { action, lines } = require('../util');
const EventEmitter = require('events');
const { beep, cursor, erase } = require('sisteransi');
const color = require('kleur');

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
        this._ && this._(str, key);
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
  }

  sprintf(...args) {
    if (!this.curState) this.curState = {
      plain: [],
      render: [],
    };
    for (const ln of args) {
      const stateLine = this.curState.render.length - 1;
      let plainValue = this.curState.plain[stateLine] ? this.curState.plain[stateLine][1] : ``;
      let renderValue = this.curState.render[stateLine] || ``;
      for (const chunk of ln) {
        switch (typeof chunk) {
          case `function`: {
            plainValue += ` `;
            renderValue += chunk();
            break;
          }
          case `object`: {
            if (chunk.value)
              plainValue += chunk.value;
            if (chunk.value && chunk.fn)
              renderValue += chunk.fn(chunk.value);
            break;
          }
          case `string`: {
            plainValue += chunk;
            renderValue += chunk;
            break;
          }
        }
        this.curState.plain[stateLine] = [lines(this.curState.plain[stateLine]), plainValue];
        this.curState.render[stateLine] = renderValue;
      }
      if (!this.prevState || stateLine > this.prevState.render.length - 1) this.drawAll = true;
      const drawLine = this.drawAll || this.curState.render[stateLine] !== this.prevState.render[stateLine];
      if (drawLine && !this.drawAll) {
        const curStateRows = this.curState.plain[stateLine][0];
        const prevStateRows = this.prevState.plain[stateLine][0];
        if (curStateRows !== prevStateRows) {
          this.drawAll = true;
        }
      }

      if (drawLine) {
        if (!this.drawAll) {
          if (this.offset === undefined) {
            this.offset = {
              virtualOffset: stateLine - this.cursorOffset.virtualOffset,
              actualOffset: 0,
            }
            for (const x = 0; x < this.cursorOffset.virtualOffset; x++) {
              if (stateLine < this.cursorOffset.virtualOffset) {
                this.offset.actualOffset -= this.curState.plain[x][0];
              } else {
                this.offset.actualOffset += this.curState.plain[x][0];
              }
            }
          } else {
            for (const x = this.offset.virtualOffset; x <= stateLine; x++) {
              this.offset.actualOffset += this.curState.plain[x][0];
            }
            this.offset = {
              virtualOffset: stateLine,
              actualOffset: 0,
            }
          }
          this.out.write(
            (this.offset.actualOffset < 0 ? cursor.up(this.offset.actualOffset * -1) : ``) +
            (this.offset.actualOffset > 0 ? cursor.down(this.offset.actualOffset) : ``) +
            cursor.to(0)
          );
        }

        const extraRowCount = this.curState.plain[stateLine][0] - 1;
        const outputEndCol = this.curState.plain[stateLine][1].length - (this.out.columns * extraRowCount);
        this.out.write(
          this.curState.render[stateLine] +
          (outputEndCol !== this.out.columns ? erase.lineEnd : ``) +
          `\n` + cursor.up(1)
        )
        this.offset = {
          virtualOffset: stateLine,
          actualOffset: 0,
        }
      }

      stateLine++;
    }
    return {
      anchorInput: () => {
        this.cursorOffset = {
          virtualOffset: this.curState.plain.length - 1,
          actualOffset: 0,
        }
        for (const x = 0; x <= virtualOffset; x++) {
          this.cursorOffset.actualOffset += this.curState.plain[x][0];
        }
      },
      done: () => {
        this.prevState = this.curState;
        this.curState = undefined;
        this.offset = undefined;
        this.renderAll = false;
        if (this.firstRender) this.firstRender = false;
      }
    }
  }
}

module.exports = Prompt;
