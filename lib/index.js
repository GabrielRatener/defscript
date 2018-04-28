

import escodegen from "escodegen"
import createConstructorList from "./ast/"
import {Parser as ExpressionParser} from "./expression-parser"
import {Parser as ModuleParser} from "./module-parser"
import {tokenize as postprocess} from "./postprocessor"
import {transform} from "./transpile"
import lexer from "./lexer"


export const getParser = (type = "module") => {
    const context = Object.freeze({
		node: createConstructorList('ds', true, () => location),
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
		}
	});
        
	const parsing =
      type === 'expression' ?
        new ExpressionParser({context}) :
      type === 'module' ?
        new ModuleParser({context}) :
        null

	let location = null;

	parsing.onreducestart = ({loc}) => {
		location = loc;
	}

	parsing.onreduceend = () => {
		location = null;
	}

	return parsing;
}

export const parse = (string, type = 'module') => {    
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
    
    const parser = getParser(type);
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

export const compileAST = (string, type = 'module') => {
    
    return transform(parse(string, type));    
}

export const compile = (string, type = 'module') => {
        
    return escodegen.generate(compileAST(string, type));
}

export const tokenize = (string, sanitize = true) => {
    if (sanitize)
        return postprocess(string);
    else
        return lexer.tokenize(string);
}