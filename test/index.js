
import vm from "vm"
import fs from "fs"
import path from "path"
import chalk from "chalk"
import * as crane from "crane-parser";

import {tokenize, parse, compileToAST, compile,
  EmbeddedLanguage, fetchInterpolation} from "../lib/index.js"

import compileTests from "./compile-only.js"

const mathLang = {
  lexer: new crane.Lexer([
    {
      type: 'int',
      regex: /[0-9]+/
    },
    {
      type: 'bin-op',
      regex: /[-+\*\/]/
    },
    {
      regex: /\(\)/
    },
    {
      type: 'ws',
      regex: /\s+/
    },
    {
      type: 'code',
      regex: /\{/,
      fetch(api) {
        const interpolation = fetchInterpolation(api.input, api.position);

        api.advanceTo(api.position + interpolation.length + 1);

        return interpolation;
      }
    }
  ]),

  Parser:
  crane
    .compile(`
      e
        > \\int     => {type: 'int', string: $[0].value}

        > e \\bin-op e =>
          {
            type: 'binary-expression'
            left: $[0]
            right: $[2]
            operator: $[1].value
          }


        > \\code =>
          {
            type: 'embedded-code'
            string: $[0].value
            ast: @parseEmbedded($[0].value)
          }

        > '(' e ')' => $[1]
    `)
    .cook()
    .generateParser()
}

class DSEmbeddedMath extends EmbeddedLanguage {
  parse(string) {
    const tokenTranslator = (a) => a;
    const context = {
      parseEmbedded(expression) {

        return parse(expression, {type: 'expression'});
      }
    };
    const parsing = new mathLang.Parser({context, tokenTranslator});

    for (const token of mathLang.lexer.tokenize(string)) {
      if (token.type !== 'ws') {
        parsing.push(token);
      }
    }

    return parsing.finish();
  }

  transform(node, transformer) {

    switch (node.type) {
      case 'int':
        return new this.es.Literal({value: parseInt(node.string)});
      case 'binary-expression':
        return new this.es.BinaryExpression({
          left: this.transform(node.left, transformer),
          right: this.transform(node.right, transformer),
          operator: node.operator
        });
      case 'embedded-code':
        return transformer.transform(node.ast);
    }
  }
}

const __url = import.meta.url
const __filename =
(__url.startsWith('file://')) ?
  __url.slice(7) :
  __url ;

const __dirname = path.dirname(__filename);

(async () => {
  const failSymbol = chalk.red('\u2718');
  const winSymbol = chalk.green('\u2714');

  const pad = (str, n) => {
    return ('' + str).padEnd(n);
  }

  const getTests = function*() {
    const tegex = /^##test:(.*)$/;
    const files =
    fs
      .readdirSync(`${__dirname}/suite`)
      .filter(name => name.endsWith('.dfs'))
    
    for (const {title, code, run} of compileTests) {
      yield {
        title,
        code,
        run: run ? run : (() => {}),
        file: 'compile-only'
      }
    }

    for (const file of files) {
      const source = fs.readFileSync(`${__dirname}/suite/${file}`, 'utf8');
      let testCase = null;
      
      for (const line of source.split('\n')) {
        const result = tegex.exec(line);
        
        if (result === null) {
          if (testCase !== null)
            testCase.code += `\n${line}`;
        } else {
          const [,rawTitle] = result;
          
          if (testCase !== null)
            yield testCase;
          
          testCase = {
            file,
            title: rawTitle.trim(),
            code: '',
            run: null
          }
        }
      }
      
      if (testCase !== null)
        yield testCase;
    }
  }

  const runtimeTest = (code) => {
    const details = []
    
    return new Promise((done) => {
      const context = {
        clearTimeout,
        clearInterval,

        log(...args) {
          console.log(...args);
        },

        timeout(ms, fn) {
          return setTimeout(fn, ms);
        },

        interval(ms, fn) {
          return setInterval(fn, ms);
        },

        eq(a, b) {
          details.push(a === b);
        },
        assert(condition) {
          details.push(condition);  
        },
        arrayEq(a, b) {
          if (a.length !== b.length)
            details.push(false);
          else {
            for (let i = 0; i < a.length; i++) {
              if (a[i] !== b[i]) {
                details.push(false);
                return;
              }
            }

            details.push(true);
          }
        },
        throws(fn) {
          try {
            fn();
            details.push(false);
          } catch (e) {
            details.push(true);
          }
        },
        // opposite of throws
        works(fn) {
          try {
            fn();
            details.push(true);
          } catch (e) {
            details.push(false);
          }
        },
        async(promise) {
          if (asyncTest) {
            console.error('Only one async call allowed per test');
          } else {
            asyncTest = new Promise((win, fail) => {
              promise.then(() => win(null), (err) => win(err));
            });
          }
        },
        error(message) {
          throw new Error(message);
        }
      }

      let asyncTest = null;

      try {
        if (typeof code === 'function') {
          code(context);
        } else {
          vm.runInNewContext(code, context);
        }
        
        if (asyncTest) {
          asyncTest.then((error) => {
            done({details, error});
          });
        } else {
          done({details, error: null});
        }
      } catch (error) {
        console.log(error);

        done({details, error});
      }        
    });
  }

  const tryOut = (fn) => {
    try {
      fn();
      return null;
    } catch (e) {
      return e;
    }
  }

  const tabulate = (title, tests, details = [], message = '') => {
    const explicitPad = {
      'run': 7
    }

    const trace =
    preliminaryTitles
      .map((name) => tests[name])
      .map(b => b ? winSymbol : failSymbol)
      .map((symbol, i) => {
        const name  = preliminaryTitles[i];

        if (explicitPad.hasOwnProperty(name)) {
          return symbol + pad('', explicitPad[name]);
        } else {
          return symbol + pad('', name.length - 1);
        }
      })
      .join('   ');
    
    const detailString =
    details
      .map((bool) => bool ? chalk.green('\u2713') : chalk.red('\u2715'))
      .join('');

    const messageString =
    (details.length > 0) ?
      ` ${message}` :
      message;
    
    console.log(`${pad(i, 4)} ${pad(title, 40)} | ${trace} ${detailString}${messageString}`);
    i++;
  }

  const embedded = {
    math: DSEmbeddedMath
  }

  const preliminaryTitles = [
    'lex',
    'parse',
    'transform',
    'generate',
    'run'
  ];

  let i = 0;

  console.log([
    `${pad('#', 4)} ${pad('title', 40)}`,
    `${preliminaryTitles.slice(0, 4).join(' > ')} > ${pad(preliminaryTitles[4], 8)} details`
  ].join(' | '));

  /*
  for (const {title, file, test} of getCompileTests()) {

  }
  */

  for (const {title, file, code, run} of getTests()) {
    const results = preliminaryTitles.reduce((obj, key) => (obj[key] = false, obj), {});
    const tests = [
      () => {
        for (const token of tokenize(code)) {
          // console.log(token.type, token.value, token.range);
        }
      },
      () => parse(code, {type: 'module'}),
      () => compileToAST(code, {type: 'module', embedded}),
      () => {
        const generated = compile(code, {
          type: 'module',
          embedded,
          map: {
            source: file,
            root: 'https://fakedomain.com/fake-path/'
          }
        });


        if (!generated.map || !generated.code) {
          throw new Error("Bad source map settings");
        }
      }
    ]

    let error = null, index = 0;

    for (const testFn of tests) {
      const err = tryOut(testFn);
      const key = preliminaryTitles[index];

      if (err) {
        error = err;
        break;
      } else {
        results[key] = !err;
      }

      index++;
    }
        
    if (results.generate) {
      const compiled = run ? run : compile(code, {
        embedded,
        type: 'module'
      });

      const {details, error} = await runtimeTest(compiled);

      results.run = !(error || details.includes(false));

      tabulate(title, results, details, error ? error.message : '');
      // console.log(`${pad(i, 4)} ${pad(title, 40)} | ${trace}   ${symbol}${pad('', 7)} ${details}`);
    
    } else {
      let msg = error.message;

      if (error.hasOwnProperty('loc'))
        msg += ` @ ${error.loc.start.line - 1}:${error.loc.start.column}`;
      
      tabulate(title, results, [], msg);
      // console.log(`${pad(i, 4)} ${pad(title, 40)} | ${trace}   ${failSymbol}${pad('', 7)} ${msg}`);
      
      /*
      for (const token of tokenize(code)) {
        const state = psr.states[psr.states.length - 1];
        const tokens = psr.stack.map(val => untranslate(val));
        try {
          psr.push(token);
        } catch (e) {
          console.log(tokens);
          psr.getLookaheads(state);
          break;
        }
      }
      */
    }        
  }
})();
