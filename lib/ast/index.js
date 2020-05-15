import lexer from "./spec-lexer.js"
import {Parser} from "./spec-parser.js"
import esSource from "./es.spec.js"
import dsSource from "./ds.spec.js"

const getSpec = (source) => {
  const context = {
    literal(value) {
      return JSON.parse(`{"type": "literal", "value": ${value}}`);
    },
    obj(twoples) {
      const o = {};
      for (const [key, value] of twoples) {
        o[key] = value;
      }

      return o;
    },
    get parser() {
      return parser;
    }
  };

  const parser = new Parser({context});

  for (const token of lexer.tokenize(source)) {
    if (token.type !== 'ws') {
      parser.push(token);
    }
  }
  
  return parser.finish();
};

const compute = (spec, type) => {
  const obj = {};
  const {base, props} = spec[type];
  
  for (const superType of base) {
    Object.assign(obj, compute(spec, superType));
  }
  
  Object.assign(obj, props);
  
  return obj;
}

export const specifications = {
  javascript: esSource,
  defscript: dsSource
}

export default (source = esSource, verify = false, locate = () => null) => {
  const obj = {};
  const excepted = new Set(['type', 'loc']);
  const spec = getSpec(source);
    
  let i = 1;
  
  for (const key in spec) {
    const def = spec[key];
    
    if (def.kind === 'interface') {
      const completeDef = verify ? compute(spec, key) : null; 
      
      obj[key] = function(fill) {                
        this.type = key;
        this.loc = locate();
        
        if (verify) {
          for (const prop in completeDef) {
            if (!fill.hasOwnProperty(prop)) {
              if (!excepted.has(prop))
                throw new Error(`Property "${prop}" expected but not found for type ${key}`);
            } else
              this[prop] = fill[prop];
          }
        } else {
          Object.assign(this, fill);
        }
        
      }
    }
  }
  
  return obj;
}