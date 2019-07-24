
import {CachedQueue, DropoutStack, Stack, Queue} from "./collections"

const string = (token) => {
	return token.source.slice(...token.range);
}

export const postprocessors = [
	// strip out whitespace and comments
	function* (streamer) {
		let last = {type: null};
		for (let token of streamer) {
			if (token.type !== 'ws' && token.type !== 'comment') {
				yield token;
			}
		}
	},

	(() => {
		// selectively strip out nl tokens

		const closure = new Map([
			['{', '}'],
			['[', ']'],
			['(', ')']
		]);

		const remove = {
			before: new Set(['nl', ']', '}', ',', 'pipes']),
			after: new Set(['[', '{', ','])
		};

		const state = (stack) => stack.length > 0 ? stack.peek() : null;

		// if two preserve only last of adjacent nl tokens
		return function* (streamer) {
			const stack = new Stack();
			for (let token of streamer) {
				// if closure opening
				if (closure.has(token.type)) {
					stack.push(token.type);
				}

				// if closure closing
				if (stack.length > 0 && closure.get(stack.peek()) === token.type) {
					stack.pop();
				}

				if (token.type === 'nl') {
					const back = streamer.lookBack();
					const next = streamer.lookAhead();

					if (back === null || next === null)
						continue;
					if (remove.after.has(back))
						continue;
					if (remove.before.has(next))
						continue;
					if (state(stack) === '(')
						continue;

				}
				
				yield token;
			}
		}
	})(),



	(() => {
		const getIndent = (token) => {
			const [end] = /[\t ]*$/.exec(string(token));

			return end.length;
		}

		const indenters = new Set(['try', 'finally', 'else', 'do']);

		return function* (streamer) {
			const stack = new Stack([0]);

			for (let token of streamer) {
				if (token.type === '{')
					stack.push('{');
				if (token.type === '}') {
					while (stack.peek() !== '{') {
						yield streamer.pseudoToken('dedent');
						stack.pop();
					}

					stack.pop();
				}

				if (token.type === 'nl') {
					const indent = getIndent(token);
					if (indenters.has(streamer.lookBack())) {
						stack.push(indent);
						yield streamer.pseudoToken('indent');
					} else {
						while (stack.peek() !== '{' && stack.peek() > indent) {
							stack.pop();
							yield streamer.pseudoToken('dedent');
						}
					}
				}

				yield token;
			}

			while (stack.peek() > 0) {
				yield streamer.pseudoToken('dedent');
				stack.pop();
			}
		}
	})(),
    
	(() => {
		return function* (streamer) {
			for (const token of streamer) {
				if (token.type === 'scalar' &&
					token.value === '*' &&
					streamer.lookAhead() === '{') {

					yield streamer.changeType(token, '*')
				} else
					yield token;
			}
		}
	})(),

    (() => {
    	// prefix functions with \fn pseudotoken

        const lookaheads = new Set(['=>', '->', '*', '~', '~*', '{']);
        
        return function* (streamer) {
            const hash = new Set();
            const stack = new Stack();
            const tokens = new Queue();
            
            for (const token of streamer) {
                if (token.type === '(') {
                    stack.push(tokens.length);
                }
                
                if (token.type === ')') {
                    const position = stack.pop();
                    
                    if (lookaheads.has(streamer.lookAhead())) {

                        hash.add(position);
                    }

                    if (stack.length === 0) {
                        let offset = 0;
                        while (tokens.length > 0) {
                            const token = tokens.dequeue();
                            
                            if (hash.has(offset))
                                yield streamer.pseudoToken('fn');
                            
                            yield token;
                            offset++;
                        }
                        
                        hash.clear();
                    }
                }
                
                if (stack.length > 0)
                    tokens.enqueue(token);
                else
                    yield token;
            }
        }
    })(),
    (() => {
        // remove newline tokens around certain tokens (take two)
        // this has to be partially redone after indentation tokens are added
        
        const before = new Set(['else', 'catch', 'finally', 'outdent']);
        const after = new Set(['indent']);
        
        return function* (streamer) {
            for (const token of streamer) {
                if (token.type === 'nl') {            
                    if (streamer.lookBack() === null || after.has(streamer.lookBack()))
                        continue;
                    
                    if (streamer.lookAhead() === null || before.has(streamer.lookAhead()))
                        continue;
                }
                
                yield token;
            }
        }
    })(),
    (() => {
		const candidates = new Set(['def', ',', 'nl', 'indent']);
		
        return function* (streamer) {
            const hash = new Set();
            const stack = new Stack();
            const tokens = new Queue();
            
            for (const token of streamer) {
                if (token.type === '{' || token.type === '[') {
					const lb = streamer.lookBack();
					const ignore = !(candidates.has(lb) || lb === null);
					  
                    stack.push({position: tokens.length, ignore});
                }
                
                if (token.type === '}' || token.type == ']') {
                    const {position, ignore} = stack.pop();
					
					if (!ignore) {
						if (streamer.lookAhead() === '=' || streamer.lookAhead() === ':=')
	                        hash.add(position);
					}
                    
                    if (stack.length === 0) {
                        let offset = 0;
                        while (tokens.length > 0) {
                            const token = tokens.dequeue();
                            
                            if (hash.has(offset))
                                yield streamer.pseudoToken('assign');
                            
                            yield token;
                            offset++;
                        }
                        
                        hash.clear();
                    }
                }
                
                if (stack.length > 0)
                    tokens.enqueue(token);
                else
                    yield token;
            }
        }
    })(),
    (() => {
    	// for statement cascades

    	return function* (streamer) {
    		for (const token of streamer) {
    			if (token.type === 'pipes' && streamer.lookAhead() === '.') {
    				yield streamer.changeType(token, 'ref');
    				yield streamer.pseudoToken('obj');
    			} else
    				yield token;
			}
		}
	})()
];

export const postprocessFactory = (postprocessors) => {
	return function*(tokens, preserve = 10) {
		const viewer = (streamer) => {
			const laQueue = new CachedQueue([]);
			const lbStack = new DropoutStack(10);
			const lastPosition = () => {
				if (stack.length === 0) {
					return 0;
				} else {
					const {range: [start, end]} = stack.peek();
					return end;
				}
			}

			let isDone = false;

			return {
				get stack() {
					return stack;
				},
				lookBack(n = 1) {
					if (n >= lbStack.length) {
						return null;
					} else {
						return lbStack
							.peek(n)
							.type;
					}
				},
				error() {

				},
				pseudoToken(type, position = lastPosition()) {
					return {
						type,
						string: '',
						value: null,
						source: string,
						range: [position, position]
					}
				},

				changeType(token, type) {
					return Object.assign({}, token, {type});
				},

				lookAhead(n = 0) {
					if (!isDone) {
						while (laQueue.length <= n) {
							const {value, done} = streamer.next();
							if (done) {
								isDone = true;
								break;
							} else
								laQueue.enqueue(value);
						}
					}

					if (n < laQueue.length)
						return laQueue
							.peek(n)
							.type;
					else
						return null;
				},

				// advances the stream
				next() {

					if (laQueue.length > 0) {
						const value = laQueue.dequeue();

						lbStack.push(value);
						return {value, done: false};
					} else {
						const {value, done} = streamer.next();
						if (done) {
							isDone = true;
							return {done: true};
						} else {
							lbStack.push(value);
							return {value, done: false};
						}
					}
				},

				[Symbol.iterator]: function() {
					return this;
				}
			}
		}

		// stack of final processed tokens
		const stack = preserve > 0 ? new DropoutStack(preserve) : new Stack();
		
		let streamer = tokens;

		for (let rewriter of postprocessors) {
			streamer = rewriter(viewer(streamer));
		}

		for (let token of streamer) {
			stack.push(token);
			yield token;
		}
	}
}

export const postprocess = postprocessFactory(postprocessors);

