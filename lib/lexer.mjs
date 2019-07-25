
import Lexer from "lexie"

const keywords = `
	def in on do
`;

const jsKeywords = `
	for if else return do while function this
	await yield break continue try catch finally
	throw new class static
`;

const regexifyKeywords = (text) => {
	const joined =
	  text
		.split(/\s+/)
		.filter((s) => s.trim() !== '')
		.join('|');
	return `\\b(?:${joined})\\b`;
}

export const patterns = [
    {
        regex: /'/,
        type: "string",
        fetch(api) {
            let escaped = false;
            while (true) {
                const c = api.next();
                                
                if (c === "'" && !escaped)
                    return;
                
                if (c === '\\')
                    escaped = true;
                else
                    escaped = false;
            }
        }
    },
	{
		regex: /#[^\n]*/,
		type: 'comment'
	},
	{
		// keywords
		regex: new RegExp(regexifyKeywords(keywords + jsKeywords))
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
		// for symbol reference
		regex: /@@/
	},
	{
		regex: /@/,
		type: 'this'
	},
	{
		regex: /\|+/,
		type: 'pipes'
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
	},
    {
        // function modifiers
        regex: /[\-\=]\>/
    },
	{
		regex: /(?:[\=\<\>\!]=|[<>])/,
		type: 'compare'
	},
	{
		regex: /[\+\-\*\/]=/,
		type: 'reassign'
	},    
    {
        regex: /\:?=/
    },
    {
        // literal punctuation tokens
        regex: /(?:\.(?:\.\.)?|[\,\:])/
    },
    {
        regex: /(?:\~\*?)/
    },    
    // operators
	{
		regex: /[\+\-]/,
		type: 'linear'
	},
	{
		regex: /(?:\/\/|[\*\/\%])/,
		type: 'scalar'
	},
	{
		regex: /\^/,
		type: 'pow'
	}
];


export default function tokenize(string, lexPatterns = patterns) {
	const lexer = new Lexer(lexPatterns);

	return lexer.tokenize(string);
}
