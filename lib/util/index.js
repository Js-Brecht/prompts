'use strict';

module.exports = {
  action: require('./action'),
  clear: require('./clear'),
  style: require('./style'),
  strip: require('./strip').strip,
  figures: require('./figures'),
  lines: require('./lines').lines,
  wrap: require('./wrap'),
  Renderer: require('./renderer').Renderer,
  InputHandler: require('./inputHandler').InputHandler,
};
