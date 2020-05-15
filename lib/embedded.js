
import {Stack} from "./collections.js"
import esSpecBuilder from "./ast/index.js"

const balanced = {
  '{': '}',
  '[': ']',
  '(': ')'
}

const balancedReversed =
Object
  .keys(balanced)
  .reduce((obj, key) => (obj[balanced[key]] = key, obj),{})

export class EmbeddedLanguage {
  constructor({lang, source, loc, offset, args = [], multiline = false}) {
    this.lang = lang;                       // name of the language
    this.source = source;                   // snippet
    this.loc = loc;                         // location information in standard line/column format
    this.offset = offset;                   // parent-string offset of source
    this.args = args;                       // language modifiers

    this.multiline = source.includes('\n'); // whether code is multiline or single-line
    this.es = esSpecBuilder();

    this.content =
    (!multiline) ?
      source.slice(lang.length + 2) :
      source
      .split('\n')
      .slice(1)
      .join('')
  }

  toJSON() {
    // TODO: Implement this
  }

  parse(source, api) {
    throw new Error(`Must implement "parse" for your embedded language`);
  }

  transform(node, api) {
    throw new Error(`Must implement "transform" for your embedded language`);
  }
}

export const fetchInterpolation = (string, start = 0) => {
  // this fetches defscript expression interpolation until the end of string
  // or until the defscript is unbalanced by one of '}])'

  const stack = new Stack();
  const stringSet = new Set();

  let inString = false, templated = false, escaped = false;

  for (let i = start; i < string.length; i++) {
    const c = string[i];
    const stringChar = templated ? '"' : "'";

    if (inString) {

      if (escaped) {
        escaped = false;

        continue;
      }

      if (!escaped && c === stringChar) {
        inString = false;
        escaped = false;
        templated = false;

        continue;
      }

      if (!escaped && templated && c === '{') {
        inString = false;
        escaped = false;

        stringSet.add(stack.length);
        stack.push('{');

        continue;
      }

      if (!escaped && c === '\\') {
        escaped = true;

        continue;
      }
    } else {

      if (c === '"' || c === "'") {
        inString = true;
        escaped = false;
        templated = (c === '"');

        continue;
      }

      if (balanced.hasOwnProperty(c)) {
        stack.push(c);

        continue;
      }

      if (balancedReversed.hasOwnProperty(c)) {
        if (stack.length === 0) {
          return string.slice(start, i);
        } else {
          stack.pop();

          if (stringSet.has(stack.length)) {
            inString = true;
            templated = true;
            escaped = false;

            stringSet.delete(stack.length);
          }

          continue;
        }
      }
    }
  }
}
