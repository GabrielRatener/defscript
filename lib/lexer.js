
import Lexer from "lexie"
import {Stack} from "./collections.js"
import {fetchInterpolation} from "./embedded.js"

const dsKeywordString = `
  def in on do
`;

const jsKeywordString = `
  for and or not if else return do while function this
  await yield break continue try catch finally throw
  throw new class static import export as from
  default
`;

const getKeywordList = (text) => {
  return text
    .split(/\s+/)
    .filter((s) => s.trim() !== '')
}

const regexifyKeywords = (text) => {
  const joined = getKeywordList(text).join('|');

  return `\\b(?:${joined})\\b`;
}

const first = (regex, str) => str.match(regex)[1];

const parseLn = (str) => {
  let pre = 0, post = 0, count = 0;

  for (let c of str) {
    if (c === '\n') {
      post = 0;
      count += 1;
    } else {
      if (count === 0)
        pre += 1;
      else
        post += 1;
    }
  }

  return {pre, post, count};
}

export const keywords = new Set(getKeywordList(dsKeywordString + jsKeywordString));

export const patterns = [
  {
    regex: /'/,
    type: "simple-string",
    fetch(api) {
      let escaped = false;
      while (true) {
        const c = api.next();
                
        if (c === "'" && !escaped)
          return;
        
        escaped = (c === '\\' && !escaped);
      }
    }
  },
  {
    regex: /"/,
    type: "rich-string",
    fetch(api) {
      // fetch whole string, including interpolations
      let escaped = false;

      while (true) {
        const c = api.next();

        if (c === '{' && !escaped) {
          const interpolated = fetchInterpolation(api.input, api.position);

          api.advanceTo(api.position + interpolated.length);

          continue;
        }

        if (c === '"' && !escaped) {
          return;
        }

        escaped = (c === '\\' && !escaped);
      }
    }
  },
  {
    regex: /#[a-z0-9]+/,
    type: 'embedded',
    fetch(stream, evaluate) {
      let leading = '';

      let value = '';

      while (stream.peek()) {
        const c = stream.next();

        if (/\s/.test(c)) {
          leading += c;
        } else {
          value += c;
          break;
        }
      }

      if (/^(\s*\n\s*)+$/.test(leading)) {
        // with linebreak
        const {post} = parseLn(leading);
        const wc = leading[leading.length - 1];
        const cleanup = (end = false) => {
          const regex = new RegExp(`^[ \\t]{0,${post}}(.*)$`);

          if (!end) {
            stream.back();
            stream.back();

            while (/^[ \t\n]$/.test(stream.peek())) {
              stream.back();
            }

            stream.next();
          }

          value = '\n' +
            evaluate()
            .split('\n')
            .slice(1)
            .map(str => str.length > post ?
                wc + first(regex, str) : '')
            .join('\n');
        };

        let indentMode = false;
        let indent = post;
        while (stream.peek()) {
          const c = stream.next();
          if (c === '\n') {
            value += c;
            indentMode = true;
            indent = 0;
          } else if (/[\t ]/.test(c)) {
            value += c;
            if (indentMode)
              indent += 1;
          } else {
            if (indentMode) {
              if (indent < post) {
                cleanup();

                return value;
              }
            }

            value += c;
          }
        }

        cleanup(true);
      } else {
        // same line

        while (stream.peek()) {
          const c = stream.next();

          if (c === '\n') {
            stream.back();
            return value;
          } else {
            value += c;
          }
        }
      }

      return value;
    }
  },
  {
    regex: /#[\s#][^\n]*/,
    type: 'comment'
  },
  {
    // keywords
    regex: new RegExp(regexifyKeywords(dsKeywordString + jsKeywordString))
  },
  {
    regex: /[ \t]+/,
    type: 'ws',
  },
  {
    regex: /(?:\s*\n\s*)+/,
    type: 'nl'
  },
  {
    // for symbol reference
    regex: /@@/
  },
  {
    regex: /@/,
    type: 'this'
  },
  {
    regex: /\|+/,
    type: 'pipes'
  },
  {
    // closeable tokens
    regex: /[\{\[\(\)\]\}]/
  },
  {
    // match floats and integers in multiple bases
    regex: /(?:[0-9]+(?:\.[0-9]+)?(?:[eE]\-?[0-9]+)?|0x[0-9a-fA-F]+|0b[01]+|0o[0-8]+)/,
    type: 'number'
  },
  {
    regex: /true|false|null|undefined/
  },
  {
    regex: /[a-zA-Z_][a-zA-Z_0-9]*/,
    type: 'id'
  },
  {
    // function modifiers
    regex: /[\-\=]\>/
  },
  {
    regex: /(?:[\=\<\>\!]=|[<>])/,
    type: 'compare'
  },
  {
    regex: /[\+\-\*\/]=/,
    type: 'reassign'
  },    
  {
    regex: /\:?=/
  },
  {
    // literal punctuation tokens
    regex: /(?:\.(?:\.\.)?|[\,\:]|\*\*|`)/
  },
  {
    regex: /(?:\~\*?)/
  },    
  // operators
  {
    regex: /[\+\-]/,
    type: 'linear'
  },
  {
    regex: /(?:\/\/|[\*\/\%])/,
    type: 'scalar'
  },
  {
    regex: /\^/,
    type: 'pow'
  },
  {
    regex: /\!/
  }
];

export const isKeywordToken = (token) => {
  return keywords.has(token.type);
}

export default function tokenize(string, lexPatterns = patterns) {
  const lexer = new Lexer(lexPatterns);

  return lexer.tokenize(string);
}
