
import {Queue, Stack, DropoutStack} from "./lib/collections"
import {tokenize} from "./lib/postprocessor"
import {parse, compile} from "./lib/"

const text = `
{
    hello(a) {
        def hello() {
            nasty()
        }

        hello()
    }
}
`;

/*

const parsing = parser("expression");

for (let token of tokenize(text)) {
	console.log(token.type, token.source.slice(...token.range));
    try {
        parsing.push(token);
    } catch (e) {
        console.log(e);
        break;
    }
}
*/

console.log(compile(text, 'expression'));
