
import Lexer from "lexie"

const keywords = `
	for if else def this in on do
`;

const jsKeywords = `
	for if else return do while function
`;

const regexifyKeywords = (text) => {
	const joined =
	  text
		.split(/\s+/)
		.filter((s) => s.trim() !== '')
		.join('|');
	return `\\b(?:${joined})\\b`;
}

const lexer = new Lexer([
	{
		regex: /#[^\n]*/,
		type: 'comment'
	},
	{
		regex: /[\+\-]/,
		type: 'plus'
	},
	{
		regex: /(?:[\*\/\%]|\/\/)/,
		type: 'mul'
	},
	{
		regex: /\^/,
		type: 'pow'
	},
	{
		regex: /[\=\<\>\!]=/,
		type: 'compare'
	},
	{
		regex: /\=/,
		type: 'assign'
	},
	{
		// keywords
		regex: new RegExp(regexifyKeywords(keywords))
	},
	{
		regex: /[ \t]+/,
		type: 'ws',
	},
	{
		regex: /(?:\s*\n\s*)+/,
		type: 'nl'
	},
	{
		regex: /@/,
		type: 'this'
	},
	{
		// closeable tokens
		regex: /[\{\[\(\)\]\}]/
	},
	{
		// match floats and integers in multiple bases
		regex: /(?:[0-9]+(?:\.[0-9]+)?(?:[eE]\-?[0-9]+)?|0x[0-9a-fA-F]+|0b[01]+|0o[0-8]+)/,
		type: 'number'
	},
	{
		regex: /true|false|null|undefined/
	},
	{
		regex: /[a-zA-Z_][a-zA-Z_0-9]*/,
		type: 'id'
	}
]);

export default lexer;