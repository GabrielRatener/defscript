
import escodegen from "escodegen"

escodegen.generate({
  "type": "Program",
  "loc": {
    "source": null,
    "start": {
      "line": 1,
      "column": 0
    },
    "end": {
      "line": 3,
      "column": 0
    }
  },
  "body": [
    {
      "type": "ExpressionStatement",
      "loc": {
        "source": null,
        "start": {
          "line": 2,
          "column": 0
        },
        "end": {
          "line": 2,
          "column": 17
        }
      },
      "expression": {
        "type": "AssignmentExpression",
        "loc": null,
        "operator": "=",
        "left": {
          "type": "Identifier",
          "loc": {
            "source": null,
            "start": {
              "line": 2,
              "column": 0
            },
            "end": {
              "line": 2,
              "column": 3
            }
          },
          "name": "hat"
        },
        "right": {
          "type": "BinaryExpression",
          "loc": {
            "source": null,
            "start": {
              "line": 2,
              "column": 6
            },
            "end": {
              "line": 2,
              "column": 17
            }
          },
          "operator": "!=",
          "left": {
            "type": "MemberExpression",
            "loc": {
              "source": null,
              "start": {
                "line": 2,
                "column": 6
              },
              "end": {
                "line": 2,
                "column": 16
              }
            },
            "object": {
              "type": "Identifier",
              "loc": {
                "source": null,
                "start": {
                  "line": 2,
                  "column": 6
                },
                "end": {
                  "line": 2,
                  "column": 11
                }
              },
              "name": "hello"
            },
            "property": {
              "type": "Identifier",
              "loc": {
                "source": null,
                "start": {
                  "line": 2,
                  "column": 12
                },
                "end": {
                  "line": 2,
                  "column": 16
                }
              },
              "name": "brag"
            },
            "computed": false
          },
          "right": {
            "type": "Literal",
            "loc": null,
            "value": null
          }
        }
      }
    }
  ],
  "sourceType": "module"
});
