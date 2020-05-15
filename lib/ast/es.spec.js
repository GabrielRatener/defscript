
export default `
  interface Node {
    type: string;
    loc: SourceLocation | null;
  }

  interface SourceLocation {
    source: string | null;
    start: Position;
    end: Position;
  }

  interface Position {
    line: number;
    column: number;
  }

  interface Program <: Node {
    type: "Program";
    body: [ Statement ];
    sourceType: "script" | "module";
  }

  interface Function <: Node {
    id: Identifier | null;
    params: [ Pattern ];
    body: BlockStatement;
    generator: boolean;
    async: boolean;
  }

  interface Statement <: Node {
  }

  interface EmptyStatement <: Statement {
    type: "EmptyStatement";
  }

  interface BlockStatement <: Statement {
    type: "BlockStatement";
    body: [ Statement ];
  }

  interface ExpressionStatement <: Statement {
    type: "ExpressionStatement";
    expression: Expression;
  }

  interface IfStatement <: Statement {
    type: "IfStatement";
    test: Expression;
    consequent: Statement;
    alternate: Statement | null;
  }

  interface LabeledStatement <: Statement {
    type: "LabeledStatement";
    label: Identifier;
    body: Statement;
  }

  interface BreakStatement <: Statement {
    type: "BreakStatement";
    label: Identifier | null;
  }

  interface ContinueStatement <: Statement {
    type: "ContinueStatement";
    label: Identifier | null;
  }

  interface WithStatement <: Statement {
    type: "WithStatement";
    object: Expression;
    body: Statement;
  }

  interface SwitchStatement <: Statement {
    type: "SwitchStatement";
    discriminant: Expression;
    cases: [ SwitchCase ];
    lexical: false;
  }

  interface ReturnStatement <: Statement {
    type: "ReturnStatement";
    argument: Expression | null;
  }

  interface ThrowStatement <: Statement {
    type: "ThrowStatement";
    argument: Expression;
  }

  interface TryStatement <: Statement {
    type: "TryStatement";
    block: BlockStatement;
    handler: CatchClause | null;
    finalizer: BlockStatement | null;
  }

  interface WhileStatement <: Statement {
    type: "WhileStatement";
    test: Expression;
    body: Statement;
  }

  interface DoWhileStatement <: Statement {
    type: "DoWhileStatement";
    body: Statement;
    test: Expression;
  }

  interface ForStatement <: Statement {
    type: "ForStatement";
    init: VariableDeclaration | Expression | null;
    test: Expression | null;
    update: Expression | null;
    body: Statement;
  }

  interface ForInStatement <: Statement {
    type: "ForInStatement";
    left: VariableDeclaration | Expression;
    right: Expression;
    body: Statement;
  }

  interface DebuggerStatement <: Statement {
    type: "DebuggerStatement";
  }

  interface Declaration <: Statement {
  }

  interface FunctionDeclaration <: Function, Declaration {
    type: "FunctionDeclaration";
    id: Identifier;
  }

  interface VariableDeclaration <: Declaration {
    type: "VariableDeclaration";
    declarations: [ VariableDeclarator ];
    kind: "var" | "let" | "const";
  }

  interface VariableDeclarator <: Node {
    type: "VariableDeclarator";
    id: Pattern;
    init: Expression | null;
  }

  interface Expression <: Node {
  }

  interface ThisExpression <: Expression {
    type: "ThisExpression";
  }

  interface ArrayExpression <: Expression {
    type: "ArrayExpression";
    elements: [ Expression | SpreadElement | null ];
  }

  interface ObjectExpression <: Expression {
    type: "ObjectExpression";
    properties: [ Property | SpreadElement ];
  }

  interface Property <: Node {
    type: "Property";
    key: Expression;
    value: Expression;
    kind: "init" | "get" | "set";
    method: boolean;
    shorthand: boolean;
    computed: boolean;
  }

  interface FunctionExpression <: Function, Expression {
    type: "FunctionExpression";
  }

  interface SequenceExpression <: Expression {
    type: "SequenceExpression";
    expressions: [ Expression ];
  }

  interface UnaryExpression <: Expression {
    type: "UnaryExpression";
    operator: UnaryOperator;
    prefix: boolean;
    argument: Expression;
  }

  interface BinaryExpression <: Expression {
    type: "BinaryExpression";
    operator: BinaryOperator;
    left: Expression;
    right: Expression;
  }

  interface AssignmentExpression <: Expression {
    type: "AssignmentExpression";
    operator: AssignmentOperator;
    left: Pattern | MemberExpression;
    right: Expression;
  }

  interface UpdateExpression <: Expression {
    type: "UpdateExpression";
    operator: UpdateOperator;
    argument: Expression;
    prefix: boolean;
  }

  interface LogicalExpression <: Expression {
    type: "LogicalExpression";
    operator: LogicalOperator;
    left: Expression;
    right: Expression;
  }

  interface ConditionalExpression <: Expression {
    type: "ConditionalExpression";
    test: Expression;
    alternate: Expression;
    consequent: Expression;
  }

  interface CallExpression <: Expression {
    type: "CallExpression";
    callee: Expression | Super;
    arguments: [ Expression | SpreadElement ];
  }

  interface NewExpression <: CallExpression {
    type: "NewExpression";
  }

  interface MemberExpression <: Expression, Pattern {
    type: "MemberExpression";
    object: Expression | Super;
    property: Expression;
    computed: boolean;
  }

  interface Pattern <: Node {
  }

  interface SwitchCase <: Node {
    type: "SwitchCase";
    test: Expression | null;
    consequent: [ Statement ];
  }

  interface CatchClause <: Node {
    type: "CatchClause";
    param: Pattern;
    guard: null;
    body: BlockStatement;
  }

  interface Identifier <: Node, Expression, Pattern {
    type: "Identifier";
    name: string;
  }

  interface Literal <: Node, Expression {
    type: "Literal";
    value: string | boolean | null | number | RegExp;
  }

  interface RegexLiteral <: Literal {
    regex: {
      pattern: string;
      flags: string;
    };
  }

  enum UnaryOperator {
    "-" | "+" | "!" | "~" | "typeof" | "void" | "delete"
  }

  enum BinaryOperator {
    "==" | "!=" | "===" | "!==" | "<" | "<=" | ">" | ">=" | "<<" | ">>" | ">>>" | "+" | "-" | "*" | "/" | "%" | "|" | "^" | "&" | "in" | "instanceof"
  }

  enum LogicalOperator {
    "||" | "&&"
  }

  enum AssignmentOperator {
    "=" | "+=" | "-=" | "*=" | "/=" | "%=" | "<<=" | ">>=" | ">>>=" | "|=" | "^=" | "&="
  }

  enum UpdateOperator {
    "++" | "--"
  }

  interface ForOfStatement <: ForInStatement {
    type: "ForOfStatement";
    await: boolean;
  }

  interface Super <: Node {
    type: "Super";
  }

  interface SpreadElement <: Node {
    type: "SpreadElement";
    argument: Expression;
  }

  interface ArrowFunctionExpression <: Function, Expression {
    type: "ArrowFunctionExpression";
    body: BlockStatement | Expression;
    expression: boolean;
  }

  interface AwaitExpression <: Expression {
    type: "AwaitExpression";
    argument: Expression;
  }

  interface YieldExpression <: Expression {
    type: "YieldExpression";
    argument: Expression | null;
  }

  interface TemplateLiteral <: Expression {
    type: "TemplateLiteral";
    quasis: [ TemplateElement ];
    expressions: [ Expression ];
  }

  interface TaggedTemplateExpression <: Expression {
    type: "TaggedTemplateExpression";
    tag: Expression;
    quasi: TemplateLiteral;
  }

  interface TemplateElement <: Node {
    type: "TemplateElement";
    tail: boolean;
    value: {
      cooked: string;
      value: string;
    };
  }

  interface AssignmentProperty <: Property {
    type: "Property";
    value: Pattern;
    kind: "init";
    method: false;
  }

  interface ObjectPattern <: Pattern {
    type: "ObjectPattern";
    properties: [ AssignmentProperty | RestElement ];
  }

  interface ArrayPattern <: Pattern {
    type: "ArrayPattern";
    elements: [ Pattern | null ];
  }

  interface RestElement <: Pattern {
    type: "RestElement";
    argument: Pattern;
  }

  interface AssignmentPattern <: Pattern {
    type: "AssignmentPattern";
    left: Pattern;
    right: Expression;
  }

  interface Class <: Node {
    id: Identifier | null;
    superClass: Expression;
    body: ClassBody;
  }

  interface ClassBody <: Node {
    type: "ClassBody";
    body: [ MethodDefinition ];
  }

  interface MethodDefinition <: Node {
    type: "MethodDefinition";
    key: Identifier;
    value: FunctionExpression;
    kind: "constructor" | "method" | "get" | "set";
    computed: boolean;
    static: boolean;
  }

  interface ClassDeclaration <: Class, Declaration {
    type: "ClassDeclaration";
    id: Identifier;
  }

  interface ClassExpression <: Class, Expression {
    type: "ClassExpression";
  }

  interface MetaProperty <: Expression {
    type: "MetaProperty";
    meta: Identifier;
    property: Identifier;
  }

  interface ImportDeclaration <: Node {
    type: "ImportDeclaration";
    specifiers: [ ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier ];
    source: Literal;
  }

  interface ImportSpecifier {
    type: "ImportSpecifier";
    imported: Identifier;
    local: Identifier;
  }

  interface ImportDefaultSpecifier {
    type: "ImportDefaultSpecifier";
    local: Identifier;
  }

  interface ImportNamespaceSpecifier {
    type: "ImportNamespaceSpecifier";
    local: Identifier;
  }

  interface ExportNamedDeclaration <: Node {
    type: "ExportNamedDeclaration";
    declaration: Declaration | null;
    specifiers: [ ExportSpecifier ];
    source: Literal | null;
  }

  interface ExportSpecifier {
    type: "ExportSpecifier";
    exported: Identifier;
    local: Identifier;
  }

  interface ExportDefaultDeclaration <: Node {
    type: "ExportDefaultDeclaration";
    declaration: Declaration | Expression;
  }

  interface ExportAllDeclaration <: Node {
    type: "ExportAllDeclaration";
    source: Literal;
  }

`