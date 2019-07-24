
const vm = require('vm');
const fs = require('fs');
const chalk = require('chalk');

(async () => {
    const {tokenize, parse, compileToAST, compile, getParser} = await import('../lib');

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
                clearTimeout,
                clearInterval,

                log(...args) {
                    console.log(...args);
                },

                timeout(ms, fn) {
                    return setTimeout(fn, ms);
                },

                interval(ms, fn) {
                    return setInterval(fn, ms);
                },

                eq(a, b) {
                    results.push(a === b);
                },
                assert(condition) {
                    results.push(condition);  
                },
                arrayEq(a, b) {
                    if (a.length !== b.length)
                        results.push(false);
                    else {
                        for (let i = 0; i < a.length; i++) {
                            if (a[i] !== b[i]) {
                                results.push(false);
                                return;
                            }
                        }

                        results.push(true);
                    }
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
                    if (asyncTest) {
                        console.error('Only one async call allowed per test');
                    } else {
                        asyncTest = new Promise((win, fail) => {
                            promise.then(() => win(null), (err) => win(err));
                        });
                    }
                },
                error(message) {
                    throw new Error(message);
                }
            }

            let asyncTest = null;

            try {
                vm.runInNewContext(code, context);
                ran = true;
                
                if (asyncTest) {
                    asyncTest.then((error) => {
                        done({results, error});
                    });
                } else {
                    done({results, error: null});
                }
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
                for (const token of tokenize(code)) {
                    // console.log(token.type, token.value);
                }
            },
            () => parse(code, {type: 'module'}),
            () => compileToAST(code, {type: 'module'}),
            () => compile(code, {type: 'module'})
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
        
            if (error || status < results.length)
                console.log(generated);

        } else {
            const [err] = preliminary.filter(e => !!e);
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

