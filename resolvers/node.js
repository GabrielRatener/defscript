
import * as dfs from "../lib/index.js"

const extensions = ['dfs']
const regex = new RegExp(`\\.(?:${extensions.join('|')})$`);

/**
 * @param {string} specifier
 * @param {object} context
 * @param {string} context.parentURL
 * @param {string[]} context.conditions
 * @param {function} defaultResolve
 * @returns {object} response
 * @returns {string} response.url
 */
export const resolve = async (specifier, context, defaultResolve) => {

  if (regex.test(specifier)) {
    return {
      url: new URL(specifier, context.parentURL).href
    };
  }

  // Let Node.js handle all other specifiers.
  return defaultResolve(specifier, context, defaultResolve);
}


/**
 * @param {string} url
 * @param {object} context (currently empty)
 * @param {function} defaultGetFormat
 * @returns {object} response
 * @returns {string} response.format
 */
export const getFormat = (url, context, defaultGetFormat) => {
  
  if (regex.test(url)) {

    return {
      format: 'module'
    };
  }
  
  // Defer to Node.js for all other URLs.
  return defaultGetFormat(url, context, defaultGetFormat);
}


/**
 * @param {string|buffer} source
 * @param {object} context
 * @param {string} context.url
 * @param {string} context.format
 * @param {function} defaultTransformSource
 * @returns {object} response
 * @returns {string|buffer} response.source
 */
export const transformSource = async (source, context, defaultTransformSource) => {
  
  if (regex.test(context.url)) {

    const jsOutput = dfs.compile(source);

    return {
      source: jsOutput
    };
  }

  // Defer to Node.js for all other sources.
  return defaultTransformSource(source, context, defaultTransformSource);
}