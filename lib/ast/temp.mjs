
import spec from "./es6.spec"


const stringify = (obj, indent = 1) => {
    if (typeof obj === 'string') {
        return `"${obj}"`;
    } else {
        const fn = table[obj.kind];
        
        return fn(obj, indent);
    }
}

const table = {
    union: ({types}, indent) =>
      types
        .map(e => stringify(e, indent))
        .join(' | '),
    array: ({base}, indent) => `[ ${stringify(base, indent)} ]`,
    reference: ({name}) => '' + name,
    literal: ({type, value}) => JSON.stringify(value),
    object: ({items}, indent) => {
        const pre = '\t'.repeat(indent);
        let ob = '{\n';
        
        for (const key in items) {
            const value = items[key];
            
            ob += `${pre}\t${key}: ${stringify(value)};\n`;
        }
        
        ob += `${pre}}`;
        
        return ob;
    }
}

for (const key in spec) {
    const obj = spec[key];
    
    switch (obj.kind) {
        case 'interface':
            if (obj.base.length > 0) {
                console.log(`interface ${key} <: ${obj.base.join(', ')} {`);
            } else {
                console.log(`interface ${key} {`);                
            }
            
            for (const prop in obj.props) {
                const value = obj.props[prop];
                
                console.log(`\t${prop}: ${stringify(value, 1)};`);
            }
            
            console.log('}');
            console.log();
            break;
        case 'enum':
            console.log(`enum ${key} {`);
            console.log(`\t${obj.values.map(stringify).join(' | ')}`)
            console.log('}');
            
            console.log();
            break;
        default:
            continue;
    }
}