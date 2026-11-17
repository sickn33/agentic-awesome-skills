/*global navigator*/
'use strict';

const {
  REGEX_BACKSLASH,
  REGEX_SPECIAL_CHARS,
  REGEX_SPECIAL_CHARS_GLOBAL
} = require('./constants');

exports.isObject = val => val !== null && typeof val === 'object' && !Array.isArray(val);
exports.hasRegexChars = str => REGEX_SPECIAL_CHARS.test(str);
exports.isRegexChar = str => str.length === 1 && exports.hasRegexChars(str);
exports.escapeRegex = str => str.replace(REGEX_SPECIAL_CHARS_GLOBAL, '\\$1');
exports.toPosixSlashes = str => str.replace(REGEX_BACKSLASH, '/');

exports.isWindows = () => {
  if (typeof navigator !== 'undefined' && navigator.platform) {
    const platform = navigator.platform.toLowerCase();
    return platform === 'win32' || platform === 'windows';
  }

  if (typeof process !== 'undefined' && process.platform) {
    return process.platform === 'win32';
  }

  return false;
};

const isLineBreak = char => char === '\n' || char === '\r' || char === '\u2028' || char === '\u2029';

exports.removeBackslashes = str => {
  const output = [];
  let close = 0;
  let lineBreak = 0;

  for (let index = 0; index < str.length; index++) {
    const char = str[index];
    if (char === '[') {
      // Advance both cursors monotonically, including for unmatched groups.
      close = Math.max(close, index + 2);
      while (close < str.length && (str[close] !== ']' || str[close - 1] === '\\')) {
        close++;
      }

      lineBreak = Math.max(lineBreak, index + 1);
      while (lineBreak < str.length && !isLineBreak(str[lineBreak])) {
        lineBreak++;
      }

      if (close < str.length && close - 1 <= lineBreak) {
        output.push(str.slice(index, close + 1));
        index = close;
        continue;
      }
    }

    if (char !== '\\' || index + 1 === str.length || isLineBreak(str[index + 1])) {
      output.push(char);
    }
  }

  return output.join('');
};

exports.escapeLast = (input, char, lastIdx) => {
  const idx = input.lastIndexOf(char, lastIdx);
  if (idx === -1) return input;
  if (input[idx - 1] === '\\') return exports.escapeLast(input, char, idx - 1);
  return `${input.slice(0, idx)}\\${input.slice(idx)}`;
};

exports.removePrefix = (input, state = {}) => {
  let output = input;
  if (output.startsWith('./')) {
    output = output.slice(2);
    state.prefix = './';
  }
  return output;
};

exports.wrapOutput = (input, state = {}, options = {}) => {
  const prepend = options.contains ? '' : '^';
  const append = options.contains ? '' : '$';

  let output = `${prepend}(?:${input})${append}`;
  if (state.negated === true) {
    output = `(?:^(?!${output}).*$)`;
  }
  return output;
};

exports.basename = (path, { windows } = {}) => {
  const segs = path.split(windows ? /[\\/]/ : '/');
  const last = segs[segs.length - 1];

  if (last === '') {
    return segs[segs.length - 2];
  }

  return last;
};
