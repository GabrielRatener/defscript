
export default class Extension {
  tokens() {
    return [];
  }

  // filter token stream (overwritten by postprocessors)
  * postprocess(streamer) {
    yield* streamer;
  }

  postprocessors() {
    return [
      (streamer) => {
        return this.postprocess(streamer);
      }
    ];
  }

  augment(api) {
    // AST define
    /*
    api.ast.interface('Name', [types], {
      // properties...
    })

    api.ast.enum(Name, iterable)

    api.ast.extend('Name', [types], {
      
    })

    api.grammar.augment

    */
  }

}