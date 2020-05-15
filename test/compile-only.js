
// compile only tests

export default [
  {
    title: "Import named",
    code: `import {a, b} from 'module-name'`,
    run(api) {

    }
  },
  {
    title: "Import named with aliasing",
    code: `import {a as c, b} from 'module-name'`,
    run(api) {

    }
  },
  {
    title: "Import default",
    code: `import baby from 'module-name'`,
    run(api) {

    }
  },
  {
    title: "Import all",
    code: `import * as baby from 'module-name'`,
    run(api) {
      
    }
  },
  {
    title: "Import default and named",
    code: `import baby, {a, b as c} from 'module-name'`,
    run(api) {
      
    }
  },
  {
    title: "Export named",
    code: `export {a, b, c}`,
    run(api) {
      
    }
  },
  {
    title: "Export named with aliasing",
    code: `export {a, b as c}`,
    run(api) {
      
    }
  },
  {
    title: "Export named from file",
    code: `export {a, b as c} from 'some-module'`,
    run(api) {
      
    }
  },
  {
    title: "Export all from file",
    code: `export * from 'some-module'`,
    run(api) {
      
    }
  },
  {
    title: "Export single variable declaration",
    code: `export def heart = 5`,
    run(api) {
      
    }
  },
  {
    title: "Export multiple variable declaration",
    code: `export def heart = 5, brain := 9`,
    run(api) {
      
    }
  },
  {
    title: "Export function declaration",
    code: `export def myFunc() {}`,
    run(api) {
      
    }
  },
  {
    title: "Export class declaration",
    code: `export def class MyClass < YourClass {}`,
    run(api) {
      
    }
  },
  {
    title: "Export default declaration",
    code: `export default slave`,
    run(api) {
      
    }
  },
  {
    title: "Real-world use",
    code: `
      import App from 'module-name'

      def app = new App({
        target: document.body
        props: {
          name: 'world'
        }
      })

      export default app
    `,
    run(api) {
      
    }
  }
]