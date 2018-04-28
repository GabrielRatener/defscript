import estemplate from "estemplate"
import {Stack} from "./collections"
import generateNodeCtor from "./ast"



export const transform = (node, stack = new Stack(), es = generateNodeCtor('es', true)) => {

    if (typeof node === 'object' && node !== null && node.hasOwnProperty('type')) {
        const pass = () => {
            const ctor = es[node.type];
            const arg = {};
                        
            if (ctor === undefined)
                throw new Error(`No JS equivalent for node type: ${node.type}`);
                
            for (const key in node) {
                if (key === 'type' || key === 'loc')
                    continue;
                
                const obj = node[key];
                
                if (Array.isArray(obj)) {
                    arg[key] =
                      obj
                        .map(e => transform(e, stack, es))
                        .reduce((arr, val) => arr.concat(val), []);
                } else {
                    arg[key] = transform(obj, stack, es);
                }
            }
            
            const output = new ctor(arg);
            
            output.loc = node.loc || null;

            return output;
        }
        
        if (transformers.hasOwnProperty(node.type)) {
            const fn = transformers[node.type];
            const context = {
                node: es,
                transform(node) {
                    return transform(node, stack, es);
                },
                // when spread is true, transforms that return arrays
                // will be concatenated to the output array
                transformAll(array, spread = true) {
                    const out = [];
                    
                    for (const node of array) {
                        const transformed = context.transform(node);
                        if (Array.isArray(transformed)) {
                            if (spread)
                                out.push(...transformed);
                            else
                                throw new Error(
                                    `${node.type} transformation cannot return array here!`
                                );
                        } else
                            out.push(transformed);
                    }
                    
                    return out;
                },
                push({state, data}) {
                    if (pushed)
                        throw new Error(`Already pushed state!`);
                    else {
                        pushed = true;
                        stack.push({state, data});
                    }
                },
                pop() {
                    if (!pushed)
                        throw new Error(`Cannot pop without pushing first!`);
                    else {
                        pushed = false;
                        stack.pop();
                    }
                },
                peek(n = 0) {
                    return stack.peek(n);
                },
                // filter runs on all states of given type, and breaker run on all states
                context(targetState, filter = () => true, breaker = () => false) {
                    
                    for (const {state, data} of stack.rewind()) {
                        if (state === targetState && filter(data, state)) {
                            return {state, data};   
                        }
                        
                        if (breaker(data, state))
                            return null;
                    }
                    
                    return null;
                },
                
                pass() {
                    return pass();
                },
                
                template(str, type = 'expression') {
                    const func = estemplate.compile(str);
                    
                    switch (type) {
                        case 'expression':
                            return (...args) => {
                                const program = func(...args);
                                
                                // Yes, unfortunately we can't easily verify the template at compile-time
                                if (program.body.length !== 1 || program.body[0].type !== 'ExpressionStatement')
                                    throw new Error('Invalid expression template');
                                
                                return program.body[0].expression;
                            }
                        case 'statement':
                            return (...args) => {
                                const program = func(...args);
                                
                                if (program.body.length !== 1)
                                    throw new Error('Invalid statement template');
                                
                                return program.body[0];
                            }
                        case 'program':
                            return (...args) => func(...args);
                        default:
                            throw new Error(`Invalid node type "${type}" for template!`);
                    }
                }
            }
            
            let pushed = false;
            
            const val = fn.apply(context, [node]);
            if (Array.isArray(val))
                val.forEach(nd => nd.loc = node.loc || null);
            else
                val.loc = node.loc || null;
            if (pushed)
                stack.pop();
            return val;
        } else {
            return pass();
        }
    } else {
        return node;
    }
}

const transformers = {
	AssignmentStatement(node) {
		return new this.node.ExpressionStatement({
			expression: new this.node.AssignmentExpression({
				operator: node.operator,
				left: this.transform(node.left),
				right: this.transform(node.right)
			})
		});
	},
	
    Program(node) {
        return new this.node.Program({
            body: this.transformAll(node.body),
            sourceType: 'script'
        });
    },
    
    BinaryExpression(node) {
        const conversions = {
            '^': '**'
        };
        
        if (node.operator === '//') {
            const templateSource = 'Math.floor(<%= left %> / <%= right %>)';
            const injector = this.template(templateSource, 'expression');
            
            return injector({
                left: this.transform(node.left),
                right: this.transform(node.right)
            });
        } if (conversions.hasOwnProperty(node.operator)) {
            return new this.node.BinaryExpression({
                left: this.transform(node.left),
                right: this.transform(node.right),
                operator: conversions[node.operator]
            });
        } else
            return this.pass();
    },
    
    BlockStatement(node) {
        return new this.node.BlockStatement({
            body: this.transformAll(node.body) 
        });
    },
    
    Function(node) {
        if (node.bound) {
            if (node.generator) {
                this.todo();
            } else {
                return new this.node.ArrowFunctionExpression({
                    id: null,
                    body: this.transform(this.body),
                    async: node.async,
                    generator: false,
                    expression: this.body.type === 'BlockStatement'
                });
            }
        } else {
            if (node.generator && node.async) {
                this.todo();
            }
            
            return new this.node.FunctionExpression({
                id: null,
                params: node.params.map(e => this.transform(e)),
                body: this.transform(node.body),
                generator: !!node.generator,
                async: !!node.async
            });
        }
    },
    FunctionDeclaration(node) {
        
        return new this.node.VariableDeclaration({
            kind: 'const',
            declarations: [
                new this.node.VariableDeclarator({
                    id: this.transform(node.id),
                    init: this.transform(node.value)
                })
            ]
        });
    },
    
    VariableDeclaration(node) {

        const push = () => {
            out.push(new this.node.VariableDeclaration({
                declarations: declarators,
                kind: last ? 'const' : 'let'
            }));
        }
        
        const out = [];
        let declarators = [];
        let last = null;
                
        for (const declarator of node.declarations) {
            if (last === null || declarator.constant === last) {
                declarators.push(this.transform(declarator));
            } else {
                push();
                
                declarators = [this.transform(declarator)];
            }

            last = declarator.constant;
        }
        
        push();
        
        if (out.length === 1)
            return out[0];
        else
            return out;
    },

    Method(node) {        
        return new this.node.Property({
            key: this.transform(node.id),
            value: this.transform(node.definition),
            kind: 'init',
            method: true,
            shorthand: false,
            computed: false
        })
    }
}