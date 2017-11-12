
import {Queue, Stack, DropoutStack} from "./lib/collections"
import {tokenize} from "./lib/postprocessor"
import lexer from "./lib/lexer"

const text = `

# a comment
a = 9
b = 8
for a in b do
	hahaha()
	hello do
		yello()
	yes()
	hope()
	if does() do
		nono()
	else
		baba()
`;

for (let token of tokenize(text)) {
	console.log(token.type, token.source.slice(...token.range));
}