
import spec from "./ast/es6"

const createConstructorList = (spec, locator) => {
	const cto = {};

	for (const key in spec) {
		const {kind} = spec[key];
		if (kind === 'interface') {
			cto[key] = function(props) {
				this.type = key;
				this.loc = locator();
				for (const prop in props) {
					this[prop] = props[prop];
				}
			}
		}
	}
}

export const parser = () => {
	const parsing = new Parser("", {
		node: createConstructorList(spec, () => location),
		location: locator,
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

	let location = null;

	parsing.onreducestart = ({loc}) => {
		location = loc;
	}

	parsing.onreduceend = () => {
		location = null;
	}

	return parsing;
}

