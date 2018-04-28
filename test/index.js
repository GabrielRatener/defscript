
import vm from "vm"
import fs from "fs"
import chalk from "chalk"
import {tokenize, parse, compileAST, compile, getParser} from "../lib"
import {untranslate} from "../lib/module-parser"

const failSymbol = chalk.red('\u2718');
const winSymbol = chalk.green('\u2714');

const pad = (str, n) => {
    return ('' + str).padEnd(n);
}

const getTests = function*() {
    const tegex = /^##test:(.*)$/;
    const files =
      fs
        .readdirSync(`${__dirname}/suite`)
        .filter(name => name.endsWith('.dfs'))
    
    for (const file of files) {
        const source = fs.readFileSync(`${__dirname}/suite/${file}`, 'utf8');
        let testCase = null;
        
        for (const line of source.split('\n')) {
            const result = tegex.exec(line);
            
            if (result === null) {
                if (testCase !== null)
                    testCase.code += `\n${line}`;
            } else {
                const [,rawTitle] = result;
                
                if (testCase !== null)
                    yield testCase;
                
                testCase = {
                    file,
                    title: rawTitle.trim(),
                    code: ''
                }
            }
        }
        
        if (testCase !== null)
            yield testCase;
    }
}

const runtimeTest = (code) => {
    const results = []
    let promiseCount = 0;
    let ran = false;
    
    return new Promise((done) => {
        const context = {
            eq(a, b) {
                results.push(a === b);
            },
            assert(condition) {
                results.push(condition);  
            },
            throws(fn) {
                try {
                    fn();
                    results.push(false);
                } catch (e) {
                    results.push(true);
                }
            },
            // opposite of throws
            works(fn) {
                try {
                    fn();
                    results.push(true);
                } catch (e) {
                    results.push(false);
                }
            },
            async(promise) {
                const index = results.length;
                const after = (won) => {
                    results[index] = !!won;
                    promiseCount--;
                    if (ran && promiseCount === 0)
                        done({results, error: null});
                }    

                promiseCount++;

                results.push(null);
                promise.then(after.bind(null, true), after.bind(null, false));
            }
        }

        try {
            vm.runInNewContext(code, context);
            ran = true;
            if (promiseCount === 0)
                done({results, error: null});
        } catch (error) {
            done({results, error});
        }        
    });
}

const tryOut = (fn) => {
    try {
        fn();
        return null;
    } catch (e) {
        return e;
    }
}

(async function() {
    let i = 0;
    const preliminaryTitles = [
        'lex',
        'parse',
        'transform',
        'generate'
    ];
    
    console.log(`${pad('#', 4)} ${pad('title', 40)} | ${preliminaryTitles.join(' > ')} > ${pad('run', 8)} details`);
    
    for (const {title, file, code} of getTests()) {        
        const preliminary = [
            () => {
                for (const token of tokenize(code)) {};
            },
            () => parse(code, 'module'),
            () => compileAST(code, 'module'),
            () => compile(code, 'module')
        ]
        .map(fn => tryOut(fn));
        
        
        const trace =
          preliminary
            .map(b => !b ? winSymbol : failSymbol)
            .map((symbol, i) => symbol + pad('', preliminaryTitles[i].length - 1))
            .join('   ');
        
        if (preliminary[preliminary.length - 1] === null) {
            const generated = compile(code, 'module');
            const {results, error} = await runtimeTest(generated);
            const status =
              results
                .map(b => b ? 1 : 0)
                .reduce((sum, val) => sum + val, 0)
            const symbol = (!error && status === results.length) ? winSymbol : failSymbol;

            let details =
              results
                .map(b => b ? chalk.green('\u2713') : chalk.red('\u2715'))
                .join('');

            if (error)
                details += ` (${error.message})`;
            console.log(`${pad(i, 4)} ${pad(title, 40)} | ${trace}   ${symbol}${pad('', 7)} ${details}`);
        } else {
            const [err] = preliminary.filter(e => !!e);
            const psr = getParser();
            let msg = err.message;

            if (err.hasOwnProperty('loc'))
				msg += ` @ ${err.loc.start.line - 1}:${err.loc.start.column}`;
			
            console.log(`${pad(i, 4)} ${pad(title, 40)} | ${trace}   ${failSymbol}${pad('', 7)} ${msg}`);
            
            /*
            for (const token of tokenize(code)) {
                const state = psr.states[psr.states.length - 1];
                const tokens = psr.stack.map(val => untranslate(val));
                try {
                    psr.push(token);
                } catch (e) {
                    console.log(tokens);
                    psr.getLookaheads(state);
                    break;
                }
            }
            */
        }
        
        i++;
    }
})();
