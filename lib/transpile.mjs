import estemplate from "estemplate"
import {Stack} from "./collections"
import generateNodeCtor from "./ast/index"

const getReservedStrings = (ast, set = new Set()) => {
    const forbid = new Set(['loc', 'type']);

    if (ast.type === 'Identifier')
        set.add(ast.name);
    else {
        for (const key in ast) if (!forbid.has(key)) {
            const obj = ast[key];

            if (obj) {
                if (obj.constructor.name === 'Array') {
                    obj.forEach((obj) => getReservedStrings(obj, set));
                } else if (obj.hasOwnProperty('type')) {
                    if (obj.type === 'Identifier')
                        set.add(obj.name);
                    else
                        getReservedStrings(obj, set);
                }
            }
        }
    }

    return set;
}

export const transform = (node, ...args) => {
    const [
        stack = new Stack(),
        es = generateNodeCtor('es', true),
        reserved = getReservedStrings(node)
    ] = args;

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
                        .map(e => transform(e, stack, es, reserved))
                        .reduce((arr, val) => arr.concat(val), []);
                } else {
                    arg[key] = transform(obj, stack, es, reserved);
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
                    return transform(node, stack, es, reserved);
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
                    if (n < stack.length)
                        return stack.peek(n);
                    else
                        return {state: 'start', data: true};
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

                newVar(name = '_opvar') {
                    let i = 1;
                    while (true) {
                        let test = `${name}$${i}`;
                        if (!reserved.has(test)) {
                            const {data} = this.context('scope');

                            data.vars.add(test);
                            reserved.add(test);

                            return test;
                        } else {
                            i++;
                        }
                    }
                },
                
                pass() {
                    return pass();
                },

                todo() {
                    throw new Error(`Transformer for "${node.type}" not fully implemented`);
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
                },


                transformBody(node, vars = new Set()) {
                    // hoist function declarations to top
                    // add opvar declaration at top
                    const functions = [];
                    const body = [];

                    node.body.forEach((statement) => {
                        if (statement.type === 'FunctionDeclaration')
                            functions.push(...this.transformAll([statement]));
                        else
                            body.push(...this.transformAll([statement]));
                    });

                    // vars can change while nodes are being transformed so adding the
                    // declarations should always come last
                    if (vars.size > 0)
                        return [
                            new this.node.VariableDeclaration({
                                kind: 'let',
                                declarations:
                                  Array
                                    .from(vars)
                                    .map((name) => new this.node.VariableDeclarator({
                                        id: new this.node.Identifier({name}),
                                        init: null
                                    }))
                            }),
                            ...functions,
                            ...body
                        ];
                    else
                        return [...functions, ...body];
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
        const el = new this.node.ExpressionStatement({
            expression: new this.node.AssignmentExpression({
                operator: node.operator,
                left: this.transform(node.left),
                right: this.transform(node.right)
            })
        });

        return el;
    },
    
    AssignmentProperty(node) {
        return new this.node.AssignmentProperty({
            type: 'Property',
            key: this.transform(node.key),
            value: this.transform(node.value),
            kind: 'init',
            method: false,
            shorthand: false,
            computed: false,
        })
    },

    CascadeStatement(node) {
        const statements = [];
        const rootName = this.newVar('_root');
        const stack = [rootName];

        this.push({
            state: 'cascade',
            data: {
                get name() {
                    return stack[stack.length - 1];
                }
            }
        });

        statements.push(new this.node.ExpressionStatement({
            expression: new this.node.AssignmentExpression({
                operator: '=',
                left: new this.node.Identifier({name: rootName}),
                right: this.transform(node.root)
            })
        }));

        for (let i = 0; i < node.statements.length; i++) {
            const statement = node.statements[i];
            const degree = node.degrees[i];

            if (i + 1 < node.degrees.length && node.degrees[i + 1] > degree) {

                // must be ExpressionStatement and degree can only increase by one for each statement
                if (statement.type === 'ExpressionStatement' && node.degrees[i + 1] === degree + 1) {
                    const {expression} = statement;
                    const newVar = this.newVar('_cascade');

                    statements.push(new this.node.ExpressionStatement({
                        expression: new this.node.AssignmentExpression({
                            operator: '=',
                            left: new this.node.Identifier({name: newVar}),
                            right: this.transform(expression)
                        })
                    }));

                    stack.push(newVar);
                } else {
                    this.error("Cascade expected expression");
                }
            } else {
                stack.splice(degree);

                statements.push(this.transform(statement));
            }
        }

        return statements;
    },

    CompareChainExpression(node) {
        const list = [];
        const map = new Map;
        const getName = (index) => {
            if (map.has(index))
                return map.get(index);
            else {
                const name = this.newVar('_temp');

                map.set(index, name);

                return name;
            }
        }

        for (let i = 0; i < node.operators.length; i++) {
            list.push(new this.node.BinaryExpression({
                operator: node.operators[i],
                left:
                  (i === 0) ?
                    this.transform(node.expressions[i]) :
                    new this.node.Identifier({name: map.get(i)}),
                right:
                  (i === node.operators.length - 1) ?
                    this.transform(node.expressions[i + 1]) :
                    new this.node.AssignmentExpression({
                        operator: '=',
                        left: new this.node.Identifier({name: getName(i + 1)}),
                        right: this.transform(node.expressions[i + 1])
                    })
            }))
        }

        if (list.length === 1)
            return list[0];
        else {
            const [left, right, ...rest] = list;

            let init = new this.node.BinaryExpression({
                left,
                right,
                operator: '&&'
            });

            rest.forEach((comparison) => {
                init = new this.node.BinaryExpression({
                    left: init,
                    right: comparison,
                    operator: '&&'
                });
            });

            return init;
        }
    },

    Program(node) {
        const vars = new Set();
        this.push({
            state: 'scope',
            data: {
                vars,
                root: true
            }
        });

        return new this.node.Program({
            body: this.transformBody(node, vars),
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
        } else if (conversions.hasOwnProperty(node.operator)) {
            return new this.node.BinaryExpression({
                left: this.transform(node.left),
                right: this.transform(node.right),
                operator: conversions[node.operator]
            });
        } else
            return this.pass();
    },
    
    BlockStatement(node) {
        const vars = new Set();

        this.push({
            state: 'scope',
            data: {
                vars,
                root: false
            }
        });

        return new this.node.BlockStatement({
            body: this.transformBody(node, vars) 
        });
    },
    
    Function(node) {
        const {state} = this.peek();
        const bound =
          (node.bound === null) ?
            (state !== 'method') :
            node.bound;

        if (bound) {
            if (node.generator) {
                const injector =
                    this.template('(<%= fn %>).apply(this, [])', 'expression');
                const call = injector({
                    fn: new this.node.FunctionExpression({
                        id: null,
                        params: [],
                        body: this.transform(node.body),
                        generator: true,
                        async: false
                    })
                });

                return new this.node.ArrowFunctionExpression({
                    id: null,
                    params: node.params.map(e => this.transform(e)),
                    body: new this.node.BlockStatement({
                        body: [new this.node.ReturnStatement({argument: call})]
                    }),
                    async: node.async,
                    generator: false,
                    expression: false
                });
            } else {
                return new this.node.ArrowFunctionExpression({
                    id: null,
                    params: node.params.map(e => this.transform(e)),
                    body: this.transform(node.body),
                    async: node.async,
                    generator: false,
                    expression: false
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
        this.push({state: 'method', data: true});

        return new this.node.Property({
            key: this.transform(node.id),
            value: this.transform(node.definition),
            kind: 'init',
            method: !node.definition.bound,
            shorthand: false,
            computed: false
        })
    },

    VirtualObjectExpression(node) {
        const {data} = this.context('cascade');

        return new this.node.Identifier({name: data.name});
    },

    YieldStatement(node) {
        return new this.node.ExpressionStatement({
            expression: new this.node.YieldExpression({
                argument: this.transform(node.argument)
            })
        });
    }
}