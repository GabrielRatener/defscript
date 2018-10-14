
import Lexer from "lexie"

export default new Lexer([
    {
        regex: /"/,
        type: "string",
        fetch(api) {
            let escaped = false;
            while (true) {
                const c = api.next();
                                
                if (c === '"' && !escaped)
                    return;
                
                if (c === '\\')
                    escaped = true;
                else
                    escaped = false;
            }
        }
    },
    {
        regex: /[\t \n]+/,
        type: 'ws'
    },
    {
        regex: /[\{\}\,\|\:\[\]\;]/
    },
    {
        regex: /\b(?:interface|enum|extends|null|true|false)\b/
    },
    {
        regex: /[a-zA-Z0-9]+/,
        type: 'id'
    },
    {
        regex: /\<\:/
    }
]);