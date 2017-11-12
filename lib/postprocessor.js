
import lexer from "./lexer"
import {CachedQueue, DropoutStack, Stack} from "./collections"

const string = (token) => {
	return token.source.slice(...token.range);
}

const cascade = [
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
		// selectively strip out ln tokens

		const closure = new Map([
			['{', '}'],
			['[', ']'],
			['(', ')']
		]);

		const remove = {
			before: new Set(['ln', ']', '}', ',']),
			after: new Set(['[', '{', ','])
		}

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

	
];

export function* tokenize(string, offset = 0, preserve = 10) {
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
			pseudoToken(type, position = lastPosition()) {
				return {
					type,
					string: '',
					value: null,
					source: string,
					range: [position, position]
				}
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
	let streamer = lexer.tokenize(string, offset);

	for (let rewriter of cascade) {
		streamer = rewriter(viewer(streamer));
	}

	for (let token of streamer) {
		stack.push(token);
		yield token;
	}
}

