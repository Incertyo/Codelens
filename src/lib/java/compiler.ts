import type { AstNode } from '../javascript/ast';

export type JavaType =
  'int' | 'boolean' | 'String' | 'void' | 'Scanner' | 'int[]' | 'boolean[]' | 'String[]' | 'null';
type Token = { text: string; start: number; end: number; line: number };
type Expr = { node: AstNode; type: JavaType; assignable?: boolean; statement?: boolean };
export type JavaMethod = {
  name: string;
  type: JavaType;
  parameters: { name: string; type: JavaType }[];
  line: number;
  start: number;
  end: number;
  bodyStart: number;
  bodyEnd: number;
  public: boolean;
};
export type JavaCompilation = { root: AstNode; methods: JavaMethod[]; className: string };
const reserved = new Set(
  'await async const debugger delete export function goto in instanceof let of strictfp super this transient typeof var volatile with yield implements extends interface enum record synchronized native abstract package import throw throws try catch finally switch case default assert long double float byte short char Object new null true false void int boolean String Scanner class public private protected static final return if else for while do break continue'.split(
    ' ',
  ),
);
const operators = [
  '>>>=',
  '>>>',
  '<<=',
  '>>=',
  '==',
  '!=',
  '<=',
  '>=',
  '&&',
  '||',
  '++',
  '--',
  '+=',
  '-=',
  '*=',
  '/=',
  '%=',
  '&=',
  '|=',
  '^=',
  '<<',
  '>>',
];
const precedence: Record<string, number> = {
  '=': 1,
  '+=': 1,
  '-=': 1,
  '*=': 1,
  '/=': 1,
  '%=': 1,
  '&=': 1,
  '|=': 1,
  '^=': 1,
  '<<=': 1,
  '>>=': 1,
  '>>>=': 1,
  '||': 2,
  '&&': 3,
  '|': 4,
  '^': 5,
  '&': 6,
  '==': 7,
  '!=': 7,
  '<': 8,
  '>': 8,
  '<=': 8,
  '>=': 8,
  '<<': 9,
  '>>': 9,
  '>>>': 9,
  '+': 10,
  '-': 10,
  '*': 11,
  '/': 11,
  '%': 11,
};
export class JavaSubsetError extends SyntaxError {
  constructor(
    message: string,
    public line: number,
  ) {
    super(`Java subset, line ${line}: ${message}`);
  }
}
function tokenize(code: string): Token[] {
  if (code.length > 30_000)
    throw new JavaSubsetError('Code exceeds the 30,000-character limit.', 1);
  const unicodeEscape = /\\u/.exec(code);
  if (unicodeEscape)
    throw new JavaSubsetError(
      'Java Unicode escapes are outside this subset, including inside comments.',
      code.slice(0, unicodeEscape.index).split('\n').length,
    );
  const tokens: Token[] = [];
  let offset = 0,
    line = 1;
  while (offset < code.length) {
    const text = code.slice(offset);
    const ignored = /^(?:\s+|\/\/[^\r\n]*|\/\*[\s\S]*?\*\/)/.exec(text)?.[0];
    if (ignored) {
      line += (ignored.match(/\n/g) ?? []).length;
      offset += ignored.length;
      continue;
    }
    if (text.startsWith('/*')) throw new JavaSubsetError('Unclosed block comment.', line);
    const value =
      /^(?:[A-Za-z_$][\w$]*|0[xX][\da-fA-F]+|0[bB][01]+|\d+|"(?:[^"\\\r\n]|\\["\\btnfr])*?")/.exec(
        text,
      )?.[0] ??
      operators.find((operator) => text.startsWith(operator)) ??
      (/^[{}()[\];,.+\-*/%<>=!~&|^?:]/.test(text) ? text[0] : undefined);
    if (!value)
      throw new JavaSubsetError(
        'Unsupported token. Use int, boolean, String and one-dimensional arrays.',
        line,
      );
    tokens.push({ text: value, start: offset, end: offset + value.length, line });
    offset += value.length;
  }
  tokens.push({ text: '<eof>', start: offset, end: offset, line });
  return tokens;
}
class Compiler {
  private tokens: Token[];
  private index = 0;
  private scopes: Map<string, JavaType>[] = [];
  private initialized = new Set<string>();
  private methods = new Map<string, JavaMethod>();
  private method: JavaMethod | null = null;
  private loopDepth = 0;
  private className = '';
  private imports = new Set<string>();
  constructor(private source: string) {
    this.tokens = tokenize(source);
  }
  private peek() {
    return this.tokens[this.index];
  }
  private take(text?: string): Token {
    const token = this.peek();
    if (text !== undefined && token.text !== text)
      this.fail(`Expected ${text}; found ${token.text}.`);
    if (token.text === '<eof>') this.fail('Unexpected end of source.');
    this.index++;
    return token;
  }
  private eat(text: string) {
    if (this.peek().text !== text) return false;
    this.index++;
    return true;
  }
  private fail(message: string): never {
    throw new JavaSubsetError(message, this.peek().line);
  }
  private name(): Token {
    const token = this.peek();
    if (
      !/^[A-Za-z_$][\w$]*$/.test(token.text) ||
      reserved.has(token.text) ||
      token.text.startsWith('__') ||
      token.text === 'arguments' ||
      token.text === 'eval'
    )
      this.fail(
        'Expected an identifier. Reserved JavaScript names and names beginning with __ are outside this subset.',
      );
    return this.take();
  }
  private type(allowVoid = false): JavaType {
    const token = this.take();
    if (
      !['int', 'boolean', 'String', 'Scanner', ...(allowVoid ? ['void'] : [])].includes(token.text)
    )
      throw new JavaSubsetError(
        'Only int, boolean, String, Scanner and one-dimensional arrays are supported.',
        token.line,
      );
    let type = token.text as JavaType;
    if (type === 'Scanner' && !this.imports.has('java.util.Scanner'))
      this.fail('Import java.util.Scanner before using Scanner.');
    if (this.eat('[')) {
      this.take(']');
      if (!['int', 'boolean', 'String'].includes(type))
        this.fail('This array type is unsupported.');
      type = `${type}[]` as JavaType;
    }
    return type;
  }
  private node(type: string, token: Token, values: Record<string, unknown> = {}): AstNode {
    const end = this.tokens[Math.max(0, this.index - 1)];
    return {
      type,
      start: token.start,
      end: end.end,
      loc: { start: { line: token.line }, end: { line: end.line } },
      ...values,
    };
  }
  private id(name: string, token = this.peek()) {
    return this.node('Identifier', token, { name });
  }
  private literal(value: unknown, token = this.peek()) {
    return this.node('Literal', token, { value });
  }
  private helper(name: string, args: AstNode[], token: Token): AstNode {
    return this.node('CallExpression', token, {
      callee: this.node('MemberExpression', token, {
        object: this.id('__java', token),
        property: this.id(name, token),
        computed: false,
        optional: false,
      }),
      arguments: args,
      optional: false,
    });
  }
  private lookup(name: string): JavaType | undefined {
    for (const scope of this.scopes.toReversed()) if (scope.has(name)) return scope.get(name);
  }
  private compatible(wanted: JavaType, actual: JavaType) {
    return (
      wanted === actual ||
      (actual === 'null' && (wanted.endsWith('[]') || ['String', 'Scanner'].includes(wanted)))
    );
  }
  private require(wanted: JavaType, expression: Expr) {
    if (!this.compatible(wanted, expression.type))
      this.fail(`Expected ${wanted}; found ${expression.type}.`);
    return expression.node;
  }
  compile(runMain: boolean): JavaCompilation {
    while (this.eat('import')) {
      const parts: string[] = [];
      while (this.peek().text !== ';') parts.push(this.take().text);
      this.take(';');
      if (!['java.util.Scanner', 'java.util.Arrays'].includes(parts.join('')))
        this.fail('Only java.util.Scanner and java.util.Arrays imports are supported.');
      this.imports.add(parts.join(''));
    }
    this.eat('public');
    this.take('class');
    this.className = this.name().text;
    if (['System', 'Arrays', 'Math', 'Integer'].includes(this.className))
      this.fail('Use a class name that does not shadow a supported Java library name.');
    this.take('{');
    const firstMethod = this.index;
    while (this.peek().text !== '}') {
      const start = this.peek();
      const isPublic = start.text === 'public';
      if (['public', 'private', 'protected'].includes(this.peek().text)) this.take();
      this.take('static');
      const type = this.type(true),
        name = this.name().text;
      if (['System', 'Arrays', 'Math', 'Integer', 'main'].includes(name) && name !== 'main')
        this.fail('This method name is reserved by the subset.');
      this.take('(');
      const parameters: JavaMethod['parameters'] = [];
      if (this.peek().text !== ')') {
        do {
          const parameterType = this.type();
          parameters.push({ name: this.name().text, type: parameterType });
        } while (this.eat(','));
      }
      this.take(')');
      if (new Set(parameters.map((parameter) => parameter.name)).size !== parameters.length)
        this.fail('Duplicate parameter names.');
      const bodyStart = this.take('{').start;
      let depth = 1;
      while (depth) {
        const next = this.take();
        if (next.text === '{') depth++;
        if (next.text === '}') depth--;
      }
      const last = this.tokens[this.index - 1];
      if (this.methods.has(name)) this.fail('Overloaded or duplicate methods are not supported.');
      this.methods.set(name, {
        name,
        type,
        parameters,
        line: start.line,
        start: start.start,
        end: last.end,
        bodyStart,
        bodyEnd: last.end,
        public: isPublic,
      });
    }
    this.take('}');
    if (this.peek().text !== '<eof>')
      this.fail(
        'Use one class with static methods; nested and additional classes are unsupported.',
      );
    this.index = firstMethod;
    const body: AstNode[] = [];
    for (const method of this.methods.values()) {
      if (
        method.parameters.some(
          (parameter) =>
            this.methods.has(parameter.name) ||
            ['System', 'Arrays', 'Math', 'Integer', this.className].includes(parameter.name),
        )
      )
        this.fail('Parameters must not shadow method, class or supported library names.');
      this.method = method;
      this.scopes = [
        new Map(method.parameters.map((parameter) => [parameter.name, parameter.type])),
      ];
      this.initialized = new Set(method.parameters.map((parameter) => parameter.name));
      this.loopDepth = 0;
      while (this.peek().start < method.bodyStart) this.take();
      const block = this.block();
      if (method.type !== 'void' && !this.returns(block))
        this.fail(`Every path in ${method.name} must return ${method.type}.`);
      body.push(
        this.node(
          'FunctionDeclaration',
          this.tokens.find((token) => token.start === method.start)!,
          {
            id: this.id(method.name),
            params: method.parameters.map((parameter) => this.id(parameter.name)),
            body: block,
            generator: false,
            async: false,
            expression: false,
          },
        ),
      );
    }
    const main = this.methods.get('main');
    if (runMain) {
      if (
        !main ||
        !main.public ||
        main.type !== 'void' ||
        main.parameters.length !== 1 ||
        main.parameters[0].type !== 'String[]'
      )
        this.fail('Run needs public static void main(String[] args).');
      const token = this.tokens.find((token) => token.start === main.start)!;
      body.push(
        this.node('ExpressionStatement', token, {
          expression: this.node('CallExpression', token, {
            callee: this.id('main', token),
            arguments: [this.node('ArrayExpression', token, { elements: [] })],
            optional: false,
          }),
        }),
      );
    }
    return {
      root: this.node('Program', this.tokens[0], { body, sourceType: 'script' }),
      methods: [...this.methods.values()],
      className: this.className,
    };
  }
  private returns(node: AstNode): boolean {
    if (node.type === 'ReturnStatement') return true;
    if (node.type === 'BlockStatement')
      return (node.body as AstNode[]).some((child) => this.returns(child));
    return (
      node.type === 'IfStatement' &&
      !!node.alternate &&
      this.returns(node.consequent as AstNode) &&
      this.returns(node.alternate as AstNode)
    );
  }
  private block(): AstNode {
    const start = this.take('{');
    this.scopes.push(new Map());
    const before = new Set(this.initialized),
      body: AstNode[] = [];
    while (this.peek().text !== '}') {
      if (
        body.some(
          (statement) =>
            this.returns(statement) ||
            ['BreakStatement', 'ContinueStatement'].includes(statement.type),
        )
      )
        this.fail('Unreachable statement.');
      body.push(this.statement());
    }
    this.take('}');
    for (const name of this.scopes.pop()!.keys())
      if (!before.has(name)) this.initialized.delete(name);
    return this.node('BlockStatement', start, { body });
  }
  private statement(): AstNode {
    const start = this.peek();
    if (start.text === '{') return this.block();
    if (this.eat(';')) return this.node('EmptyStatement', start);
    if (this.eat('if')) {
      this.take('(');
      const test = this.require('boolean', this.expression());
      this.take(')');
      const before = new Set(this.initialized),
        consequent = this.controlBody();
      this.initialized = new Set(before);
      const alternate = this.eat('else') ? this.controlBody() : null;
      this.initialized = before;
      return this.node('IfStatement', start, { test, consequent, alternate });
    }
    if (this.eat('while')) {
      this.take('(');
      const test = this.require('boolean', this.expression());
      this.take(')');
      const before = new Set(this.initialized);
      this.loopDepth++;
      const body = this.controlBody();
      this.loopDepth--;
      this.initialized = before;
      return this.node('WhileStatement', start, { test, body });
    }
    if (this.eat('for')) {
      this.take('(');
      this.scopes.push(new Map());
      const before = new Set(this.initialized);
      const init =
        this.peek().text === ';'
          ? null
          : this.isType()
            ? this.declaration()
            : this.statementExpression();
      this.take(';');
      const test = this.peek().text === ';' ? null : this.require('boolean', this.expression());
      this.take(';');
      const update = this.peek().text === ')' ? null : this.statementExpression();
      this.take(')');
      this.loopDepth++;
      const body = this.controlBody();
      this.loopDepth--;
      this.scopes.pop();
      this.initialized = before;
      return this.node('ForStatement', start, { init, test, update, body });
    }
    if (this.eat('return')) {
      const argument = this.peek().text === ';' ? null : this.expression();
      if (this.method!.type === 'void' ? !!argument : !argument)
        this.fail('Return value does not match the method type.');
      if (argument) this.require(this.method!.type, argument);
      this.take(';');
      return this.node('ReturnStatement', start, { argument: argument?.node ?? null });
    }
    if (this.eat('break') || this.eat('continue')) {
      if (!this.loopDepth) this.fail('break and continue need an enclosing loop.');
      this.take(';');
      return this.node(start.text === 'break' ? 'BreakStatement' : 'ContinueStatement', start, {
        label: null,
      });
    }
    if (this.isType()) {
      const declaration = this.declaration();
      this.take(';');
      return declaration;
    }
    const expression = this.statementExpression();
    this.take(';');
    return this.node('ExpressionStatement', start, { expression });
  }
  private statementExpression(): AstNode {
    const expression = this.expression();
    if (!expression.statement)
      this.fail('Expected an assignment, increment, constructor or method call statement.');
    return expression.node;
  }
  private controlBody() {
    if (this.peek().text === '{') return this.block();
    if (this.isType()) this.fail('A declaration in a control body needs braces.');
    return this.statement();
  }
  private isType() {
    return ['int', 'boolean', 'String', 'Scanner'].includes(this.peek().text);
  }
  private declaration(): AstNode {
    const start = this.peek(),
      type = this.type(),
      declarations: AstNode[] = [];
    do {
      const token = this.name(),
        name = token.text;
      if (
        this.lookup(name) ||
        this.methods.has(name) ||
        ['System', 'Arrays', 'Math', 'Integer', this.className].includes(name)
      )
        this.fail('Shadowing a local, method or built-in name is outside this subset.');
      this.scopes.at(-1)!.set(name, type);
      let init: AstNode | null = null;
      if (this.eat('=')) {
        const value =
          this.peek().text === '{' && type.endsWith('[]')
            ? this.arrayInitializer(type)
            : this.expression();
        init = this.require(type, value);
        this.initialized.add(name);
      } else this.fail('Initialize each local at its declaration in this subset.');
      declarations.push(this.node('VariableDeclarator', token, { id: this.id(name, token), init }));
    } while (this.eat(','));
    return this.node('VariableDeclaration', start, { kind: 'let', declarations });
  }
  private arrayInitializer(type: JavaType): Expr {
    const start = this.take('{'),
      elements: AstNode[] = [];
    if (this.peek().text !== '}') {
      do {
        if (this.peek().text === '}') break;
        elements.push(this.require(type.slice(0, -2) as JavaType, this.expression()));
      } while (this.eat(','));
    }
    this.take('}');
    return { type, node: this.node('ArrayExpression', start, { elements }) };
  }
  private expression(minimum = 1): Expr {
    const start = this.peek();
    let left = this.unary();
    while ((precedence[this.peek().text] ?? 0) >= minimum) {
      const operator = this.take().text,
        rank = precedence[operator];
      const right = this.expression(rank === 1 ? rank : rank + 1);
      if (rank === 1) {
        if (!left.assignable) this.fail('Assignment needs a writable local or array element.');
        const value =
          operator === '=' ? right : this.binary(operator.slice(0, -1), left, right, start);
        this.require(left.type, value);
        if (left.node.type === 'MemberExpression') {
          if (operator !== '=')
            this.fail('Use a separate read and assignment for compound array updates.');
          left = {
            type: left.type,
            node: this.helper(
              'set',
              [left.node.object as AstNode, left.node.property as AstNode, value.node],
              start,
            ),
          };
        } else {
          const name = String(left.node.name);
          this.initialized.add(name);
          left = {
            type: left.type,
            node: this.node('AssignmentExpression', start, {
              operator: '=',
              left: left.node,
              right: value.node,
            }),
          };
        }
        left.statement = true;
      } else left = this.binary(operator, left, right, start);
    }
    return this.read(left, start);
  }
  private read(value: Expr, token: Token): Expr {
    if (value.node.type === 'Identifier' && !this.initialized.has(String(value.node.name)))
      throw new JavaSubsetError(
        'Read of an uninitialized local. Initialize locals when declaring them in this subset.',
        token.line,
      );
    if (value.node.type === 'MemberExpression' && value.node.computed)
      return {
        type: value.type,
        node: this.helper(
          'get',
          [value.node.object as AstNode, value.node.property as AstNode],
          token,
        ),
      };
    return { ...value, assignable: false };
  }
  private binary(operator: string, left: Expr, right: Expr, token: Token): Expr {
    left = this.read(left, token);
    right = this.read(right, token);
    if (operator === '+' && (left.type === 'String' || right.type === 'String')) {
      if (
        ![left.type, right.type].every((type) =>
          ['int', 'boolean', 'String', 'null'].includes(type),
        )
      )
        this.fail('String concatenation supports only scalar values.');
      return { type: 'String', node: this.helper('concat', [left.node, right.node], token) };
    }
    if (['==', '!='].includes(operator)) {
      if (left.type === 'void' || right.type === 'void')
        this.fail('A void call has no value to compare.');
      if (left.type === 'String' && right.type === 'String')
        this.fail('String identity comparison is outside this subset. Use .equals().');
      if (!this.compatible(left.type, right.type) && !this.compatible(right.type, left.type))
        this.fail('Incompatible equality operands.');
      return {
        type: 'boolean',
        node: this.node('BinaryExpression', token, {
          operator: operator === '==' ? '===' : '!==',
          left: left.node,
          right: right.node,
        }),
      };
    }
    if (['&&', '||'].includes(operator)) {
      this.require('boolean', left);
      this.require('boolean', right);
      return {
        type: 'boolean',
        node: this.node('LogicalExpression', token, {
          operator,
          left: left.node,
          right: right.node,
        }),
      };
    }
    this.require('int', left);
    this.require('int', right);
    if (['<', '>', '<=', '>='].includes(operator))
      return {
        type: 'boolean',
        node: this.node('BinaryExpression', token, {
          operator,
          left: left.node,
          right: right.node,
        }),
      };
    return {
      type: 'int',
      node: this.helper('integer', [this.literal(operator, token), left.node, right.node], token),
    };
  }
  private unary(): Expr {
    const token = this.peek();
    if (['!', '~', '-', '+', '++', '--'].includes(token.text)) {
      this.take();
      if (token.text === '-' && this.peek().text === '2147483648') {
        this.take();
        return { type: 'int', node: this.literal(-2147483648, token) };
      }
      const value = this.unary();
      if (['++', '--'].includes(token.text)) return this.increment(value, token, true);
      if (token.text === '!')
        return {
          type: 'boolean',
          node: this.node('UnaryExpression', token, {
            operator: '!',
            argument: this.require('boolean', this.read(value, token)),
            prefix: true,
          }),
        };
      const argument = this.require('int', this.read(value, token));
      return {
        type: 'int',
        node:
          token.text === '+'
            ? argument
            : this.helper(
                'integer',
                [
                  this.literal(token.text === '-' ? '-' : '^', token),
                  this.literal(token.text === '-' ? 0 : -1, token),
                  argument,
                ],
                token,
              ),
      };
    }
    return this.postfix();
  }
  private increment(value: Expr, token: Token, prefix: boolean): Expr {
    if (!value.assignable || value.node.type !== 'Identifier')
      this.fail('Increment supports initialized int locals only.');
    this.require('int', this.read(value, token));
    const updated = this.node('AssignmentExpression', token, {
      operator: '=',
      left: value.node,
      right: this.helper(
        'integer',
        [this.literal('+', token), value.node, this.literal(token.text === '++' ? 1 : -1, token)],
        token,
      ),
    });
    return {
      type: 'int',
      statement: true,
      node: prefix
        ? updated
        : this.helper(
            'integer',
            [this.literal('-', token), updated, this.literal(token.text === '++' ? 1 : -1, token)],
            token,
          ),
    };
  }
  private postfix(): Expr {
    const token = this.peek();
    let result = this.primary();
    while (true) {
      if (this.eat('[')) {
        const array = this.read(result, token);
        if (!result.type.endsWith('[]')) this.fail('Indexing requires an array.');
        const index = this.require('int', this.expression());
        this.take(']');
        result = {
          type: result.type.slice(0, -2) as JavaType,
          assignable: true,
          node: this.node('MemberExpression', token, {
            object: array.node,
            property: index,
            computed: true,
            optional: false,
          }),
        };
      } else if (this.eat('.')) {
        const name = this.take().text,
          object = this.read(result, token);
        if (name === 'length' && result.type.endsWith('[]'))
          result = { type: 'int', node: this.helper('length', [object.node], token) };
        else {
          const args = this.arguments();
          if (result.type === 'String' && name === 'length' && !args.length)
            result = { type: 'int', node: this.helper('length', [object.node], token) };
          else if (result.type === 'String' && name === 'equals' && args.length === 1) {
            this.require('String', args[0]);
            result = {
              type: 'boolean',
              node: this.helper('equals', [object.node, args[0].node], token),
            };
          } else if (
            result.type === 'String' &&
            name === 'substring' &&
            [1, 2].includes(args.length)
          ) {
            args.forEach((arg) => this.require('int', arg));
            result = {
              type: 'String',
              node: this.helper('substring', [object.node, ...args.map((arg) => arg.node)], token),
            };
          } else if (
            result.type === 'Scanner' &&
            ['nextInt', 'nextLine', 'next', 'hasNextInt', 'hasNextLine', 'close'].includes(name) &&
            !args.length
          )
            result = {
              type:
                name === 'nextInt'
                  ? 'int'
                  : name.startsWith('has')
                    ? 'boolean'
                    : name === 'close'
                      ? 'void'
                      : 'String',
              node: this.helper(name, [object.node], token),
            };
          else this.fail(`Unsupported method ${name} on ${result.type}.`);
          result.statement = true;
        }
      } else if (['++', '--'].includes(this.peek().text))
        result = this.increment(result, this.take(), false);
      else break;
    }
    return result;
  }
  private arguments(): Expr[] {
    this.take('(');
    const args: Expr[] = [];
    if (this.peek().text !== ')')
      do {
        args.push(this.expression());
      } while (this.eat(','));
    this.take(')');
    return args;
  }
  private primary(): Expr {
    const token = this.take();
    if (token.text === '(') {
      const value = this.expression();
      this.take(')');
      return { ...value, statement: false };
    }
    if (token.text.startsWith('"')) {
      const text = token.text
        .slice(1, -1)
        .replace(
          /\\(["\\btnfr])/g,
          (_, character: string) =>
            ({ b: '\b', t: '\t', n: '\n', f: '\f', r: '\r', '"': '"', '\\': '\\' })[character]!,
        );
      return { type: 'String', node: this.literal(text, token) };
    }
    if (/^\d/.test(token.text)) {
      if (/^0\d/.test(token.text)) this.fail('Octal integer literals are outside this subset.');
      const value = Number(token.text);
      if (!Number.isSafeInteger(value) || value > 2147483647)
        this.fail('Use a signed 32-bit int literal.');
      return { type: 'int', node: this.literal(value, token) };
    }
    if (['true', 'false', 'null'].includes(token.text))
      return {
        type: token.text === 'null' ? 'null' : 'boolean',
        node: this.literal(token.text === 'null' ? null : token.text === 'true', token),
      };
    if (token.text === 'new') {
      if (this.eat('Scanner')) {
        if (!this.imports.has('java.util.Scanner'))
          this.fail('Import java.util.Scanner before using Scanner.');
        this.take('(');
        this.take('System');
        this.take('.');
        this.take('in');
        this.take(')');
        return { type: 'Scanner', statement: true, node: this.helper('scanner', [], token) };
      }
      const type = this.take().text;
      if (!['int', 'boolean', 'String'].includes(type))
        this.fail('Object construction is outside this subset.');
      this.take('[');
      if (this.eat(']')) return this.arrayInitializer(`${type}[]` as JavaType);
      const size = this.require('int', this.expression());
      this.take(']');
      return {
        type: `${type}[]` as JavaType,
        node: this.helper(
          'array',
          [size, this.literal(type === 'int' ? 0 : type === 'boolean' ? false : null, token)],
          token,
        ),
      };
    }
    if (token.text === 'System') {
      this.take('.');
      this.take('out');
      this.take('.');
      const method = this.take().text;
      const args = this.arguments();
      if (
        !['print', 'println'].includes(method) ||
        args.length > 1 ||
        (!args.length && method === 'print') ||
        args.some((arg) => !['String', 'boolean', 'int'].includes(arg.type))
      )
        this.fail('Use System.out.print/println with one scalar, or println().');
      return {
        type: 'void',
        statement: true,
        node: this.helper(
          'print',
          [args[0]?.node ?? this.literal('', token), this.literal(method === 'println', token)],
          token,
        ),
      };
    }
    if (token.text === 'Arrays') {
      if (!this.imports.has('java.util.Arrays'))
        this.fail('Import java.util.Arrays before using Arrays.');
      this.take('.');
      this.take('toString');
      const args = this.arguments();
      if (args.length !== 1 || !args[0].type.endsWith('[]'))
        this.fail('Arrays.toString requires one array.');
      return {
        type: 'String',
        statement: true,
        node: this.helper('arrayString', [args[0].node], token),
      };
    }
    if (token.text === 'Math') {
      this.take('.');
      const name = this.take().text,
        args = this.arguments();
      if (!['min', 'max', 'abs'].includes(name) || args.length !== (name === 'abs' ? 1 : 2))
        this.fail('Only integer Math.min, max and abs are supported.');
      args.forEach((arg) => this.require('int', arg));
      return {
        type: 'int',
        statement: true,
        node: this.helper(
          'math',
          [this.literal(name, token), ...args.map((arg) => arg.node)],
          token,
        ),
      };
    }
    if (token.text === 'Integer') {
      this.take('.');
      this.take('parseInt');
      const args = this.arguments();
      if (args.length !== 1) this.fail('Integer.parseInt requires one String.');
      return {
        type: 'int',
        statement: true,
        node: this.helper('parseInt', [this.require('String', args[0])], token),
      };
    }
    const name = token.text === this.className ? (this.take('.'), this.name().text) : token.text;
    const method = this.methods.get(name);
    if (method && this.peek().text === '(') {
      const args = this.arguments();
      if (args.length !== method.parameters.length) this.fail(`Wrong argument count for ${name}.`);
      args.forEach((arg, index) => this.require(method.parameters[index].type, arg));
      return {
        type: method.type,
        statement: true,
        node: this.node('CallExpression', token, {
          callee: this.id(name, token),
          arguments: args.map((arg) => arg.node),
          optional: false,
        }),
      };
    }
    const type = this.lookup(name);
    if (!type)
      throw new JavaSubsetError(`Unknown name or unsupported Java construct: ${name}.`, token.line);
    return { type, node: this.id(name, token), assignable: true };
  }
}
export function compileJavaSubset(source: string, runMain = true): JavaCompilation {
  return new Compiler(source).compile(runMain);
}
