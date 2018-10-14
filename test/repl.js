
const livescript = require("livescript");
const readline = require("readline");
const fs = require("fs");
const vm = require("vm");

import("../lib/")
    .then(({parse, compileAST, compile, tokenize}) => {
        // current code in question
        let code = null;

        const {min, max} = Math;

        const show = (text, {start: {line, column}}, show = 3) => {
            const rows = text.split('\n');
            const start = max(line - 1 - show, 0);
            const end = min(rows.length, line + show);
            const numPadding = (end - 1 + '').length + 1;
            
            for (let i = start; i < end; i++) {
                const row = rows[i];
                
                console.log(`${(''+ i).padEnd(numPadding)}|  ${row}`);
                if (i + 1 === line) {
                    let lead = '';
                    for (let i = 0; i < column; i++) {
                        lead += (row[i] === '\t' ? '\t' : ' ');
                    }
                    console.log(`${' '.repeat(numPadding)}   ${lead}^`);
                }
            }
        }

        const readFile = (filename) => {
            return fs.readFileSync(`${process.cwd()}/${filename}`, 'utf8');
        }

        const prompt = (question, cb) => {
            const instance = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            instance.question(question, (answer) => {
                instance.close();
                cb(null, answer);
            });
        }

        const context = Object.freeze({
            tokenize(text, postprocess = true) {
                code = text;
                for (const {type, value} of tokenize(text, postprocess)) {
                    console.log(`${type}\t: ${value}`);
                }
            },
            parse(text, expression = true) {
                code = text;
                const type = expression ? 'expression' : 'module';
                const ast = parse(text, type);

                console.log(JSON.stringify(ast, null, 4));
                console.log();
            },
            compile(text, toAST = false, expression = true) {
                code = text;
                const type = expression ? 'expression' : 'module';

                if (toAST) {
                    const ast = compileAST(text, type);
                    
                    console.log(JSON.stringify(ast, null, 4));
                } else {
                    console.log(compile(text, type));
                }
                
                console.log();
            },
            tokenizeFile(file, postprocess = true) {
                context.tokenize(readFile(file), postprocess);
            },
            parseFile(file, expression = false) {
                context.parse(readFile(file), expression);
            },
            compileFile(file, toAST = false, expression = false) {
                context.compile(readFile(file), toAST, expression);
            }
        });

        const start = () => {
            prompt('>> ', (err, source) => {
                const js = livescript.compile(source, {
                    bare: true,
                    header: false
                });
                
                if (err)
                    return;
                
                try {
                    vm.runInNewContext(js, context);
                } catch (e) {

                    if (e.hasOwnProperty('loc')) {
                        console.log(e.loc);
                        show(code, e.loc);
                    }
                    
                    console.log(e.message);
                    console.log();
                }
                
                start();
            });
        }

        start();
    });