
import * as ds from "defscript-core"

const embeddedLanguages = {

}

const addEmbedded = ({embedded, ...options}) => {
    return {
        embedded: {
            ...embeddedLanguages,
            ...embedded
        },
        ...options
    }
}

export const parse = (string, options = {type: 'module'}) => {

    return ds.parse(string, addEmbedded(options));
}

export const compileToAST = (string, options = {}) => {

    return ds.compileToAST(string, addEmbedded(options));
}

export const compile = (string, options = {}) => {

    return ds.compile(string, addEmbedded(options));
}

export const tokenize = (string, options = {}) => {

    return ds.tokenize(string, addEmbedded(options));
}