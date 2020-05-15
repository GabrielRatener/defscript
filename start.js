
import jolt from "jolt.sh"

const {$} = jolt;

const generateParser = (file, type = 'module') => {
  if (!['module', 'expression'].includes(type)) {

    throw new Error(`Invalid parser type "${type}"`);
  } else {
    const root = type === 'module' ? 'module' : 'e';

    $`crane grammar.crane -r ${root} > ${file}`;
  }
}

const crane = () => {
  try {

    generateParser('lib/parser.out.js', 'module');
    generateParser('lib/expression-parser.out.js', 'expression');
  } catch (e) {
    console.log(e);
  }
}

const repl = () => {
  $`node test/repl.js`;
}

const test = async () => {
  $`node test/index.js`;
}

const postinstall = () => {
  crane();
}

const main = (script, args = []) => {
  
  switch(script) {
    
    case 'crane':
    case 'parsers':
      crane(...args);
      return;
    
    case 'test':
      test(...args);
      return;

    case 'repl':
      repl(...args);
      return;

    case 'postinstall':
      postinstall();
      return;

    default:
      console.error(`Invalid script ${script}`);
      console.error(`Exiting...`);
  }
}

if (process.argv.length < 3) {
  main('repl', []);
} else {
  const [script, ...args] = process.argv.slice(2);

  main(script, args);
}