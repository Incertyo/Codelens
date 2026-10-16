import { generate } from 'astring';
import {
  bindingNames,
  children,
  functionName,
  isFunction,
  isNode,
  parseProgram,
  type AstNode,
} from './ast';
type Scope = { names: string[]; name: string };
export function instrumentJavaScript(
  code: string,
): { code: string; hookName: string } {
  const root = parseProgram(code);
  const used = new Set<string>();
  const inspect = (node: AstNode) => {
    if (node.type === 'Identifier') used.add(String(node.name));
    if (node.type === 'Identifier' && node.name === 'Promise')
      throw new SyntaxError(
        'Promise-based asynchronous code is not supported by this synchronous tracer.',
      );
    if (
      ['ImportExpression', 'AwaitExpression', 'YieldExpression', 'WithStatement'].includes(
        node.type,
      ) ||
      node.async ||
      node.generator
    )
      throw new SyntaxError(
        'Use synchronous JavaScript: imports, async/await, generators, and with are not supported by this tracer.',
      );
    children(node).forEach(inspect);
  };
  inspect(root);
  let hookName = '__codelens_trace';
  while (used.has(hookName)) hookName += '_';
  const statement = (text: string) => (parseProgram(text).body as AstNode[])[0];
  const expression = (text: string) => statement(`(${text});`).expression as AstNode;
  const collect = (node: AstNode, top = true): string[] => {
    if (!top && isFunction(node))
      return node.type === 'FunctionDeclaration' ? bindingNames(node.id as AstNode) : [];
    const own =
      node.type === 'VariableDeclarator'
        ? bindingNames(node.id as AstNode)
        : node.type === 'CatchClause'
          ? bindingNames(node.param as AstNode)
          : [];
    return [...own, ...children(node).flatMap((c) => collect(c, false))];
  };
  const getters = (scope: Scope) =>
    `{${[...new Set([...scope.names, 'this'])].map((name) => `[${JSON.stringify(name)}]:()=>${name}`).join(',')}}`;
  const line = (node: AstNode, scope: Scope) =>
    statement(`${hookName}.line(${node.loc?.start.line ?? 1},${getters(scope)});`);
  const block = (node: AstNode, scope: Scope): AstNode =>
    node.type === 'BlockStatement'
      ? transform(node, scope)
      : { type: 'BlockStatement', body: transformList([node], scope) };
  const transformList = (body: AstNode[], scope: Scope): AstNode[] =>
    body.flatMap((node) => {
      const prefix =
        node.directive ||
        node.type === 'FunctionDeclaration' ||
        ['ForStatement', 'WhileStatement', 'DoWhileStatement', 'BlockStatement'].includes(node.type)
          ? []
          : [line(node, scope)];
      return [...prefix, transform(node, scope)];
    });
  const transform = (node: AstNode, scope: Scope, parent?: AstNode): AstNode => {
    if (isFunction(node)) {
      const name = functionName(node, parent);
      let body = node.body as AstNode;
      if (body.type !== 'BlockStatement')
        body = {
          type: 'BlockStatement',
          body: [{ type: 'ReturnStatement', argument: body, loc: body.loc }],
        };
      const inner: Scope = {
        names: [...(node.params as AstNode[]).flatMap(bindingNames), ...collect(body)],
        name,
      };
      node.params = (node.params as AstNode[]).map((param) => transform(param, inner, node));
      const original = transformList(body.body as AstNode[], inner);
      const directives: AstNode[] = [];
      while (original[0]?.directive) directives.push(original.shift()!);
      let caught = '__codelens_error';
      while (used.has(caught)) caught += '_';
      const wrapper = statement(
        `try{}catch(${caught}){${hookName}.markException(${caught});throw ${caught};}finally{${hookName}.leave();}`,
      );
      (wrapper.block as AstNode).body = original;
      node.body = {
        type: 'BlockStatement',
        body: [
          ...directives,
          (
            (
              statement(
                `function _(){${hookName}.enter(${JSON.stringify(name)},${node.loc?.start.line ?? 1},${getters(inner)},${parent?.type === 'MethodDefinition' && parent.kind === 'constructor' ? 'true' : node.type === 'ArrowFunctionExpression' ? 'false' : 'new.target !== undefined'});}`,
              ).body as AstNode
            ).body as AstNode[]
          )[0],
          wrapper,
        ],
      };
      return node;
    }
    if (node.type === 'BlockStatement') {
      node.body = transformList(node.body as AstNode[], scope);
      return node;
    }
    if (node.type === 'ReturnStatement') {
      const arg = node.argument
        ? transform(node.argument as AstNode, scope, node)
        : expression('undefined');
      node.argument = {
        type: 'CallExpression',
        callee: expression(`${hookName}.returnValue`),
        arguments: [arg],
        optional: false,
      };
      return node;
    }
    if (node.type === 'ThrowStatement') {
      const arg = transform(node.argument as AstNode, scope, node);
      node.argument = {
        type: 'CallExpression',
        callee: expression(`${hookName}.throwValue`),
        arguments: [expression(String(node.loc?.start.line ?? 1)), arg, expression(getters(scope))],
        optional: false,
      };
      return node;
    }
    if (node.type === 'TryStatement' && node.finalizer) {
      let caught = '__codelens_origin';
      while (used.has(caught)) caught += '_';
      const protect = (body: AstNode): AstNode => {
        const guard = statement(
          `try{}catch(${caught}){${hookName}.captureError(${caught});throw ${caught};}`,
        );
        guard.block = body;
        return { type: 'BlockStatement', body: [guard] };
      };
      node.block = protect(block(node.block as AstNode, scope));
      if (node.handler) {
        const handler = transform(node.handler as AstNode, scope, node);
        handler.body = protect(handler.body as AstNode);
        node.handler = handler;
      }
      node.finalizer = protect(block(node.finalizer as AstNode, scope));
      return node;
    }
    if (['ForStatement', 'WhileStatement', 'DoWhileStatement'].includes(node.type)) {
      const test = node.test ? transform(node.test as AstNode, scope, node) : expression('true');
      node.test = {
        type: 'SequenceExpression',
        expressions: [line(node, scope).expression as AstNode, test],
      };
      if (node.init) node.init = transform(node.init as AstNode, scope, node);
      if (node.update) node.update = transform(node.update as AstNode, scope, node);
      node.body = block(node.body as AstNode, scope);
      return node;
    }
    if (node.type === 'ForOfStatement' || node.type === 'ForInStatement') {
      node.left = transform(node.left as AstNode, scope, node);
      node.right = transform(node.right as AstNode, scope, node);
      const body = block(node.body as AstNode, scope);
      (body.body as AstNode[]).unshift(line(node, scope));
      node.body = body;
      return node;
    }
    if (node.type === 'IfStatement') {
      node.test = transform(node.test as AstNode, scope, node);
      node.consequent = block(node.consequent as AstNode, scope);
      if (node.alternate) node.alternate = block(node.alternate as AstNode, scope);
      return node;
    }
    if (node.type === 'LabeledStatement') {
      node.body = transform(node.body as AstNode, scope, node);
      return node;
    }
    if (node.type === 'SwitchCase') {
      if (node.test) node.test = transform(node.test as AstNode, scope, node);
      node.consequent = transformList(node.consequent as AstNode[], scope);
      return node;
    }
    if (node.type === 'CatchClause') {
      const body = block(node.body as AstNode, scope);
      const names = bindingNames(node.param as AstNode);
      if (names.length && (node.param as AstNode)?.type === 'Identifier')
        (body.body as AstNode[]).unshift(
          statement(
            `${hookName}.caught(${node.loc?.start.line ?? 1},${names[0]},${getters(scope)});`,
          ),
        );
      node.body = body;
      return node;
    }
    for (const [key, value] of Object.entries(node)) {
      if (isNode(value)) node[key] = transform(value, scope, node);
      else if (Array.isArray(value))
        node[key] = value.map((v) => (isNode(v) ? transform(v, scope, node) : v));
    }
    return node;
  };
  const scope: Scope = { names: collect(root), name: '<module>' };
  const body = transformList(root.body as AstNode[], scope);
  const directives: AstNode[] = [];
  while (body[0]?.directive) directives.push(body.shift()!);
  root.body = [
    ...directives,
    statement(`${hookName}.begin(${getters(scope)});`),
    ...body,
    statement(`${hookName}.end();`),
  ];
  return { code: generate(root as Parameters<typeof generate>[0]), hookName };
}
