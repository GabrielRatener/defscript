
import fs from "fs"
import path from "path"
import * as crane from "crane-parser"
import escodegen from "escodegen"
import createConstructorList, {specifications} from "./ast/index"
import {postprocessors, postprocessFactory} from "./postprocessor"
import {transformers, transformFactory} from "./transpile"
import lex, {patterns} from "./lexer"
import {Parser} from "./parser.out"

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const grammarSource = fs.readFileSync(`${__dirname}/grammar.crane`, 'utf8');

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

            extensions: [],
            sanitize: true,
            type: 'module',


            // 0: no caching, 1: check grammar, 2: always use cached parsing table
            caching: 0

            // future stuff...
            //
            //   (options.extensions && options.extensions.length > 0) ?
            //     0 :
            //     2 
        };

        return Object.assign({}, model, options);
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

export const getParser = (options) => {
    const opts = getOptions(options);

    const context = Object.freeze({
		node: createConstructorList(opts.spec.join('\n'), true, () => location),
		get location() {
            return location;
        },
		get instance() {
			return parsing;
		},

		// shorthand functions
        literal(value) {
             return new this.node.Literal({value});
        },
		binaryExpression([left, op, right]) {
			return new this.node.BinaryExpression({
				operator: op,
				left,
				right,
			})
		},
		unaryExpression($, prefix = true) {
			if (prefix) {
				var [operator, argument] = $;
			} else {
				var [argument, operator] = $;
			}

			return new this.node.UnaryExpression({
				prefix,
				argument,
				operator
			});
        },
        ...opts.context
	});
    
    // only generate augmented parser when augmentations or extensions exist
    const ParserConstructor =
      (opts.augmentations.length > 0 || opts.extensions.length > 0) ?
        getCraneParser(options) :
        Parser;

    const parsing = new ParserConstructor({context});

	let location = null;

	parsing.onreducestart = ({loc}) => {
		location = loc;
	}

	parsing.onreduceend = () => {
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
    
    const parser = getParser(options);
    let offset = 0, line = 1, column = 0;
    
    for (const token of tokenize(string)) {
        token.loc = {
            // don't mess up the order of the properties here
            start: advanceTo(token.range[0]),
            end: advanceTo(token.range[1])
        }
        
        // for debugging ... idiot!
        // console.log(token);
        
        parser.push(token);
    }
    
    return parser.finish();
}

// compile defscript string into JavaScript AST
export const compileToAST = (string, options) => {
    const opts = getOptions(options);
    const transform = transformFactory({...transformers, ...opts.transformers});

    return transform(parse(string, options));
}

// compile defscript string into JavaScript string
export const compile = (string, options) => {

    return escodegen.generate(compileToAST(string, options));
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
