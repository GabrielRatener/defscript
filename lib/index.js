
import fs from "fs"
import path from "path"
import * as crane from "crane-parser"
import escodegen from "escodegen"

import createConstructorList, {specifications} from "./ast/index.js"
import {postprocessors, postprocessFactory} from "./postprocessor.js"
import {transformers, transformFactory} from "./transpile.js"
import lex, {patterns} from "./lexer.js"
import {Parser as ModuleParser} from "./parser.out.js"
import {Parser as ExpressionParser} from "./expression-parser.out.js"

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const grammarSource = fs.readFileSync(`${__dirname}/../grammar.crane`, 'utf8');

const getOptions = (options) => {
  if (!options)
    return getOptions({});

  if (options._complete) {
    return options;
  } else {
    const
      patterns = [],
      postprocessors = [],
      augmentations = [],
      spec = [specifications.defscript],
      transformers = {};



    if (options.extensions) {
      const iface = (name, [...superclasses], body) => {
        let lines = [];

        if (superclasses.length > 0)
          lines.push(`interface ${name} <: ${superclasses.join(', ')} {`);
        else
          lines.push(`interface ${name} {`);

        for (const key in body) {
          if (body.hasOwnProperty(key)) {
            lines.push(`\t${key}: ${body[key]};`)
          }
        }

        lines.push('}');

        return lines.join('\n');
      }

      const enumb = (name, [...strings]) => {
        return `enum ${name} {\n\t${strings.join(' | ')}\n}`;
      }

      const transform = (name, func) => {
        transformers[name] = func;
      }

      const api = {
        ast: {
          addInterface(name, ...args) {
            spec.push(iface(name, ...args));

            return {
              transform(...args) {
                return transform(name, ...args);
              }
            }
          },

          addEnum(...args) {
            spec.push(enumb(...args));
          },

          extendInterface(name, ...args) {
            spec.push(`extend ${iface(name, ...args)}`);

            return {
              transform(...args) {
                transform(name, ...args);
              }
            }
          },

          extendEnum(...args) {
            spec.push(`extend ${enumb(...args)}`);
          },

          transform(name, func) {
            transform(name, func);
          }
        },
        grammar: {
          augment(type, rule, action = null) {
            augmentations.push({type, rule, action});
          }
        }
      }


      for (const extension of options.extensions) {

        patterns.push(...extension.tokens());
        postprocessors.push(...extension.postprocessors());

        extension.augment(api);
      }
    }

    const model = {
      _complete: true,
      patterns,
      postprocessors,
      augmentations,
      transformers,
      spec,

      // embedded languages
      embedded: {},

      // complete language extensions
      extensions: [],

      sanitize: true,
      type: 'module',
      map: null,

      // 0: no caching, 1: check grammar, 2: always use cached parsing table
      caching: 0

      // future stuff...
      //
      //   (options.extensions && options.extensions.length > 0) ?
      //     0 :
      //     2 
    };

    return {...model, ...options};
  }
}

export const extract = (type, ast) => {
  switch (type) {
    case 'module':
      return ast;

    case 'statement':
      if (ast.body.length === 1) {
        return ast.body[0];
      }

    case 'expression':
      if (ast.body.length === 1 && ast.body[0].type === 'ExpressionStatement') {
        return ast.body[0].expression;
      }
    default:
      return null;
  }
}

export const getCraneParser = (options) => {
  const opts = getOptions(options);
  const nada = () => {};
  const getAll = () => {
    const hotGrammar = computeGrammar();
    const parsingTable = hotGrammar.generateParsingTable();

    return {
      hotGrammar,
      parsingTable,
      Parser: crane.parserFactory(parsingTable, hotGrammar.actions)
    }
  }

  const computeGrammar = () => {
    const grammar = crane.read(grammarSource, {
      rootName: opts.type === 'expression' ? 'e' : 'module'
    });

    const hotGrammar = grammar.cook();

    for (const {type, rule, action = null} of opts.augmentations) {
      if (action)
        hotGrammar.augment(type, rule, action);
      else
        hotGrammar.augment(type, rule);
    }

    return hotGrammar;
  }

  /* No caching for now...
  //
  // return Parser and cache/rebuild parsing table if necessary
  const assertLRTable = (hotGrammar) => {
    const fname = `${__dirname}/.${opts.type}.lr-table.cache.json`;
    if (fs.existsSync(fname)) {
      const json = JSON.parse(fs.readFileSync(fname));
      const lrTable = crane.ParsingTable.fromJSON(json);

      return crane.parserFactory(lrTable, hotGrammar.actions);
    } else {
      const parsingTable = hotGrammar.generateParsingTable();
      const Parser = crane.parserFactory(parsingTable, hotGrammar.actions);
      const text = JSON.stringify(parsingTable.toJSON());

      fs.writeFileSync(`${__dirname}/.${opts.type}.lr-table.cache.json`, text, 'utf8');

      return Parser;
    }
  }
  */

  // no caching, aka always build LR table from scratch
  if (opts.caching === 0) {
    const {Parser} = getAll();

    return Parser;
  }

  /* put off advanced caching features for now...
  //
  // rebuid LR table only if grammar has changed
  if (opts.caching === 1) {
    const hotGrammar = getGrammar();

    const grammarString = JSON.stringify(hotGrammar.grammar.toJSON());
    const grammarFile = `${__dirname}/.grammar.cache.json`;

    if (fs.existsSync(grammarFile) &&
      fs.readFileSync(grammarFile, 'utf8') === grammarString) {

      return assertLRTable(hotGrammar);
    } else {
      const {Parser, hotGrammar, parsingTable} = getAll(opts.type);
      const grammarText = JSON.stringify(hotGrammar.grammar.toJSON());
      const lrTableText = JSON.stringify(parsingTable.toJSON());

      fs.writeFileSync(`${__dirname}/.grammar.cache.json`, grammarText, 'utf8');
      fs.writeFileSync(`${__dirname}/.${opts.type}.lr-table.cache.json`, lrTableText, 'utf8');

      return Parser;
    }
  }

  
  if (opts.caching === 2) {
    const hotGrammar = getGrammar();

    return assertLRTable(hotGrammar);
  }
  */
}

export {EmbeddedLanguage, fetchInterpolation} from "./embedded.js"

export const getParser = (options, source = null) => {
  const opts = getOptions(options);
  const opTranslations = new Map([
    ['and', '&&'],
    ['or', '||'],
    ['not', '!']
  ]);

  const context = Object.freeze({
    node: createConstructorList(opts.spec.join('\n'), true, () => location),

    get rootLoc() {
      if (source) {
        const lines = source.split('\n');

        return {
          source: null,
          start: {
            line: 1,
            column: 0
          },
          end: {
            line: lines.length,
            column: lines[lines.length - 1].length
          }
        }
      } else {
        return null;
      }
    },
    get source() {
      return source;
    },
    get location() {
      return location;
    },
    get instance() {
      return parsing;
    },

    embedded(token) {
      const [offset] = token.range;
      const loc = reduceData.loc;
      const source = token.source.slice(...token.range);
      const regex = /^\#([a-z0-9]+)/;
      const [, lang] = regex.exec(source);
      
      if (opts.embedded.hasOwnProperty(lang)) {
        const Ctor = opts.embedded[lang];
        const snippet = new Ctor({lang, source, offset, loc});

        return new this.node.EmbeddedExpression({
          snippet,
          ast: snippet.parse(snippet.content)
        });
      } else {
        return null;
      }
    },

    escapade(source, preserveEnds = false) {
      const slice =
      (preserveEnds) ?
        source :
        source.slice(1, -1);

      let string = '';
      let escaped = false;

      for (const c of slice) {
        if (c === '\\' && !escaped) {
          escaped = true;
        } else {
          string += ((escaped) ? eval(`"\\${c}"`) : c);
          escaped = false;
        }
      }

      return string;
    },

    // shorthand functions
    literal(value) {
      return new this.node.Literal({value});
    },

    binaryExpression([left, operator, right]) {
      
      return new this.node.BinaryExpression({
        left,
        right,
        operator:
        opTranslations.has(operator) ?
          opTranslations.get(operator) :
          operator
      })
    },
    
    unaryExpression($, prefix = true) {
      const [operator, argument] =
      prefix ?
        $ :
        $.slice(0).reverse();

      return new this.node.UnaryExpression({
        prefix,
        argument,
        operator:
        opTranslations.has(operator) ?
          opTranslations.get(operator) :
          operator
      });
    },
    ...opts.context
  });
  
  // only generate augmented parser when augmentations or extensions exist
  const ParserConstructor =
  (opts.augmentations.length > 0 || opts.extensions.length > 0) ?
    getCraneParser(options) :
  (opts.type === 'module') ?
    ModuleParser :
    ExpressionParser;

  const tokenTranslator = (token) =>
  token.type.startsWith('embedded') ? 
    token :
    token.value;

  const parsing = new ParserConstructor({context, tokenTranslator});

  let location = null, reduceData = null;

  parsing.onreducestart = (data) => {
    reduceData = data;

    location = {source: null, ...data.loc};
  }

  parsing.onreduceend = () => {
    reduceData = null;

    location = null;
  }

  return parsing;
}

// parse defscript string into defscript AST
export const parse = (string, options = {type: 'module'}) => {
  const advanceTo = (index) => {
    for (let i = offset; i < index; i++) {
      if (string[i] === '\n') {
        line++;
        column = 0;
      } else {
        column++;
      }
    }
    
    offset = index;
    
    return {line, column};
  }
  
  const opts = getOptions(options);

  const parser = getParser(opts, string);
  let offset = 0, line = 1, column = 0;
  
  for (const token of tokenize(string)) {
    token.loc = {
      // don't mess up the order of the properties here
      start: advanceTo(token.range[0]),
      end: advanceTo(token.range[1]),
      source: null
    }
    
    // for debugging ... idiot!
    // console.log(token);
    
    parser.push(token);
  }
  
  return extract(opts.type, parser.finish());
}

// compile defscript string into JavaScript AST
export const compileToAST = (string, options) => {
  const opts = getOptions(options);
  const transform = transformFactory({...transformers, ...opts.transformers});
  const parsed = parse(string, options);

  return transform(parsed);
}

// compile defscript string into JavaScript string
export const compile = (string, options) => {

  const opts = getOptions(options);

  if (opts.map !== null) {
    const {source = null, root = null} = options.map;

    return escodegen.generate(compileToAST(string, opts), {
      sourceMapWithCode: true,
      sourceMapRoot: root,
      sourceMap: source
    });

  } else {
    return escodegen.generate(compileToAST(string, opts));
  }
}

// tokenize a defscript string
export const tokenize = (string, options = {}) => {
  const opts = getOptions(options);
  const tokenIterable = lex(string, [...patterns, ...opts.patterns]);
  if (opts.sanitize) {
    const postprocess =
      postprocessFactory([...postprocessors, ...opts.postprocessors]);

    return postprocess(tokenIterable);
  } else
    return tokenIterable;
}
