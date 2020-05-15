
import estemplate from "estemplate"

import {Stack} from "./collections.js"
import generateNodeCtor, {specifications} from "./ast/index.js"

const ALL = '*', DEFAULT = null;

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




const helpers = {
  iife(compiledStatements) {
    return new this.node.CallExpression({
      arguments: [],
      callee: new this.node.ArrowFunctionExpression({
        id: null,
        async: false,
        generator: false,
        expression: false,
        params: [],
        body: new this.node.BlockStatement({
          body: compiledStatements
        })
      })
    })
  },

  transformClass(node, name) {
    const extension = node.superClass ? `extends <%= extendee %>` : '';
    const classBase = `class ${name ? name : ''} ${extension} {}`;
    const isExpression = !name;
    const injector =
    isExpression ?
      this.template(`(${classBase})`, 'expression') :
      this.template(classBase, 'statement');

    const classVar = name ? name : this.newVar('_Anonymous', false);
    const bound = [];
    const unbound = [];
    const params = {};

    if (node.superClass)
      params.extendee = this.transform(node.superClass)

    for (const method of node.body) {
      if (method.value.bound) {
        if (method.kind === 'constructor') {
          this.error(`Constructor must be an unbound function`);
        }

        bound.push(method);
      } else {
        unbound.push(method);
      }
    }
    const replacementBody = new this.node.ClassBody({
      body: unbound.map((m) => {
        if (m.kind === 'symbol') {
          return new this.node.MethodDefinition({
            ...m,
            key: new this.node.MemberExpression({
              computed: false,
              object: new this.node.Identifier({name: 'Symbol'}),
              property: new this.node.Identifier({name: m.key.name})
            }),
            value: this.transform(m.value, true),
            computed: true
          });
        } else {
          return new this.node.MethodDefinition({
            ...m,
            key: this.transform(m.key),
            value: this.transform(m.value, true)
          });
        }
      })
    });

    if (bound.length > 0) {
      const base = injector(params);
      const statements = [];
  
      base.body = replacementBody;

      if (isExpression) {
        statements.push(
          this.inject(`const ${classVar} = <%= base %>`, 'statement', {base})
        );
      } else {
        statements.push(base);
      }
      
      for (const method of bound) {
        const templating = 
        (method.static) ? 
          `${classVar}.${method.key.name} = <%= fn %>` :
        (method.kind === 'symbol') ?
          `${classVar}.prototype[Symbol.${method.key.name}] = <%= fn %>` :
          `${classVar}.prototype.${method.key.name} = <%= fn %>`;

        const statement = this.inject(templating, 'statement', {
          fn: this.transform(method.value)
        });

        statements.push(statement);
      }

      statements.push(new this.node.ReturnStatement({
        argument: new this.node.Identifier({name: classVar})
      }));

      return this.iife(statements);
    } else {
      const node = this.inject(`(${classBase})`, 'expression', params);
      
      node.body = replacementBody;

      return node;
    }
  }
}

export const transformFactory = (transformers) => {
  const transform = (node, ...args) => {
    const [
      stack = new Stack(),
      es = generateNodeCtor(specifications.javascript, true),
      reserved = getReservedStrings(node),
      imports = new Map(),
      customArgs = []
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
              .map(e => transform(e, stack, es, reserved, []))
              .reduce((arr, val) => arr.concat(val), []);
          } else {
            arg[key] = transform(obj, stack, es, reserved, []);
          }
        }
        
        const output = new ctor(arg);
        output.loc = node.loc || null;

        return output;
      }
      
      if (transformers.hasOwnProperty(node.type)) {
        const fn = transformers[node.type];
        const context = {
          imports,
          node: es,

          addImport(path, name, target = DEFAULT) {
            if (!imports.has(path)) {
              imports.set(path, new Map());
            }

            imports
              .get(path)
              .set(name, target);
          },

          transform(node, ...customArgs) {
            return transform(node, stack, es, reserved, imports, customArgs);
          },

          // when spread is true, transforms that return arrays
          // will be concatenated to the output array
          transformAll(array, spread = true, ...customArgs) {
            const out = [];
            
            for (const node of array) {
              const transformed = context.transform(node, ...customArgs);
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
          push(state, data = {}) {
            pushes++;
            stack.push({state, data});
          },
          pop() {
            if (pushes > 0) {
              pushes--;
              stack.pop();
            } else
              throw new Error(`Cannot pop without pushing first!`);
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

          newVar(name = '_opvar', declare = true) {

            const {data} = this.context('scope');
            let i = 1;

            if (!reserved.has(name)) {
              if (declare) {
                data.vars.add(name);
              }

              reserved.add(name);

              return name;
            }

            while (true) {
              let test = `${name}$${i}`;
              if (!reserved.has(test)) {

                if (declare) {
                  data.vars.add(test);
                }

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

          error(message) {
            throw new Error(message);
          },

          inject(str, type = 'expression', params = {}) {
            const injector = this.template(str, type);

            return injector(params);
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


          transformBody(node, vars = new Set(), ...customArgs) {
            // hoist function declarations to top
            // add opvar declaration at top
            const functions = [];
            const body = [];

            node.body.forEach((statement) => {
              if (statement.type === 'FunctionDeclaration')
                functions.push(...this.transformAll([statement], true, ...customArgs));
              else
                body.push(...this.transformAll([statement], true, ...customArgs));
            });

            // vars can change while nodes are being transformed so adding the
            // declarations should always come last
            if (vars && vars.size > 0)
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
          },
          ...helpers
        }
        
        let pushes = 0;
        const val = fn.apply(context, [node, ...customArgs]);

        if (Array.isArray(val)) {
          val.forEach(nd => nd.loc = node.loc || null);
        } else {
          val.loc = node.loc || null;
        }

        while (pushes > 0) {
          pushes--;
          stack.pop();
        }

        return val;
      } else {
        return pass();
      }
    } else {
      return node;
    }
  }

  return transform;
}

export const transformers = {
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

    this.push( 'cascade', {
      get name() {
        return stack[stack.length - 1];
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

    this.push('scope', {
      vars,
      root: true
    });


    const body = this.transformBody(node, vars)
    const addedImports = [];

    for (const [source, aliases] of this.imports) {
      const specifiers = [];

      for (const [name, imported] of aliases) {

        const local = new this.node.Identifier({name});

        if (imported === ALL) {
          specifiers.push(new this.node.ImportNamespaceSpecifier({local}));
          continue;
        }

        if (imported === DEFAULT) {
          specifiers.push(new this.node.ImportDefaultSpecifier({local}));
          continue;
        }

        specifiers.push(new this.node.ImportSpecifier({
          local,
          imported: new this.node.Identifier({name: imported})
        }));
      }

      addedImports.push(new this.node.ImportDeclaration({
        specifiers,
        source: new this.node.ImportDeclaration({value: source}),
      }));
    }

    return new this.node.Program({
      body: [
        ...addedImports,
        ...body
      ],
      sourceType: 'module'
    });
  },
  
  BinaryExpression(node) {        
    const templates = {
      '//': 'Math.floor(<%= left %> / <%= right %>)',
      '^': 'Math.pow(<%= left %>, <%= right %>)'
    }

    if (templates.hasOwnProperty(node.operator)) {
      const injector = this.template(templates[node.operator], 'expression');
      
      return injector({
        left: this.transform(node.left),
        right: this.transform(node.right)
      });
    } else {
      return this.pass();
    }
  },
  
  ForInStatement(node) {
    return new this.node.ForOfStatement({
      left: new this.node.VariableDeclaration({
        kind: 'const',
        declarations: [
          new this.node.VariableDeclarator({
            id: this.transform(node.left),
            init: null
          })
        ]
      }),
      right: this.transform(node.right),
      body: this.transform(node.body),
      await: node.async
    });
  },

  BlockStatement(node) {
    const vars = new Set();

    this.push('scope', {
      vars,
      root: false
    });

    return new this.node.BlockStatement({
      body: this.transformBody(node, vars)
    });
  },
  
  Function(node, isMethod = false, thisOverride = null) {
    const implicitBinding = (node.bound === null);
    const bound =
    implicitBinding ?
      !isMethod :
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
            async: node.async
          })
        });

        return new this.node.ArrowFunctionExpression({
          id: null,
          params: node.params.map(e => this.transform(e)),
          body: new this.node.BlockStatement({
            body: [new this.node.ReturnStatement({argument: call})]
          }),
          async: false,
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
      if (isMethod && implicitBinding)
        this.push('this-context', {thisOverride});
      else
        this.push('this-context', {thisOverride: null});

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

  ExportNamedDeclaration(node) {

    if (node.declaration && node.declaration.type === 'VariableDeclaration') {
      return this.transform(node.declaration, true);
    } else {
      return this.pass();
    }
  },
  
  StringExpression(node) {
    let expression = new this.node.Literal({value: ''}) ;

    for (let i = 0; i < node.parts.length; i++) {
      const part = node.parts[i];

      expression = new this.node.BinaryExpression({
        left: expression,
        right:
        (part.type === 'StringLiteral') ?
          new this.node.Literal({value: part.value}) :
        (part.type === 'StringInterpolation') ?
          this.transform(part.argument) :
          this.error(`Bad node type "${part.type}" in "StringExpression"`),
        operator: '+'
      });
    }

    return expression;
  },

  VariableDeclaration(node, doExport = false) {

    const push = () => {
      const declaration = new this.node.VariableDeclaration({
        declarations: declarators,
        kind: last ? 'const' : 'let'
      });

      if (doExport) {
        out.push(new this.node.ExportNamedDeclaration({
          declaration,
          specifiers: [],
          source: null
        }));
      } else {
        out.push(declaration);
      }
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

  ThisExpression(node) {
    const context = this.context('this-context');

    if (context === null) {
      this.error("Invalid use of `this`");
    } else {
      if (context.data.thisOverride === null) {
        return new this.node.ThisExpression({});
      } else {
        return new this.node.Identifier({
          name: context.data.thisOverride
        });
      }
    }
  },

  ObjectExpression(node) {
    let hasSticky = false;

    const name = this.newVar('obj', false);
    const injector =
      this.template(
        `(() => {const ${name} = <%= obj %>; return ${name};})()`,
        'expression'
        );

    const obj = new this.node.ObjectExpression({
      properties: node.properties.map((p) => {
        if (p.type === 'Method') {
          if (p.definition.bound === null) {
            hasSticky = true;
          }

          return this.transform(p, name);
        } else
          return this.transform(p);
      })
    });

    if (hasSticky) {
      return injector({obj});
    } else {
      return obj;
    }
  },

  ClassDeclaration(node) {
    return this.inject(`const ${node.id.name} = <%= cls %>`, 'statement', {
      cls: this.transformClass(node)
    });
  },

  ClassExpression(node) {

    return helpers.transformClass(node);
  },

  // for class methods...
  ClassMethod(node) {

    return new this.node.MethodDefinition({
      key: this.transform(node.id),
      value: this.transform(node.definition),
      kind:
      (node.id.name === 'constructor') ?
        'constructor' :
        'method',
      computed: false,
      static: node.static
    });
  },

  // for object methods
  Method(node, subject = null) {
    const key =
    (node.kind !== 'symbol') ?
      new this.node.Identifier({name: node.id.name}) :
      new this.node.MemberExpression({
        computed: false,
        object: new this.node.Identifier({name: 'Symbol'}),
        property: new this.node.Identifier({name: node.id.name})
      }) ;

    return new this.node.Property({
      key,
      value: this.transform(node.definition, true, subject),
      kind: 'init',
      method: !node.definition.bound,
      shorthand: false,
      computed: (node.kind === 'symbol')
    });
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
  },
  
  EmbeddedExpression(node) {

    return node.snippet.transform(node.ast, this);
  }
}

export const transform = transformFactory(transformers);
