import { parse } from 'acorn';
import { describeProgram, type BreakdownData, type StaticFacts } from '../breakdown';
export type AstNode = {
  type: string;
  start?: number;
  end?: number;
  loc?: { start: { line: number }; end: { line: number } };
  [key: string]: unknown;
};
export function isNode(value: unknown): value is AstNode {
  return (
    typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string'
  );
}
export function children(node: AstNode): AstNode[] {
  return Object.values(node).flatMap((v) =>
    isNode(v) ? [v] : Array.isArray(v) ? v.filter(isNode) : [],
  );
}
export function parseProgram(code: string): AstNode {
  return parse(code, {
    ecmaVersion: 'latest',
    sourceType: 'script',
    locations: true,
  }) as unknown as AstNode;
}
export function bindingNames(node: AstNode | null | undefined): string[] {
  if (!node) return [];
  if (node.type === 'Identifier') return [String(node.name)];
  if (node.type === 'RestElement') return bindingNames(node.argument as AstNode);
  if (node.type === 'AssignmentPattern') return bindingNames(node.left as AstNode);
  if (node.type === 'ArrayPattern')
    return (node.elements as (AstNode | null)[]).flatMap(bindingNames);
  if (node.type === 'ObjectPattern')
    return (node.properties as AstNode[]).flatMap((p) =>
      bindingNames((p.type === 'RestElement' ? p.argument : p.value) as AstNode),
    );
  return [];
}
export const isFunction = (node: AstNode) =>
  ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(node.type);
export function functionName(node: AstNode, parent?: AstNode): string {
  const id = node.id as AstNode | undefined;
  if (id?.name) return String(id.name);
  const named =
    parent?.type === 'VariableDeclarator'
      ? parent.id
      : parent?.type === 'MethodDefinition' || parent?.type === 'Property'
        ? parent.key
        : undefined;
  return isNode(named) && named.name ? String(named.name) : '<anonymous>';
}
export function analyzeJavaScript(code: string): BreakdownData {
  try {
    const root = parseProgram(code);
    const outline: BreakdownData['outline'] = [],
      functions: BreakdownData['functions'] = [],
      annotations = new Map<number, { line: number; text: string; code: string }>();
    const facts: StaticFacts = {
      names: [],
      loops: 0,
      maxLoopDepth: 0,
      branches: 0,
      arrays: false,
      hashing: false,
      linked: false,
      recursive: false,
    };
    const snippet = (n: AstNode) =>
      code
        .slice(n.start ?? 0, n.end ?? 0)
        .replace(/\s+/g, ' ')
        .slice(0, 160);
    const walk = (
      node: AstNode,
      depth = 0,
      loopDepth = 0,
      parent?: AstNode,
      currentFunction?: BreakdownData['functions'][number],
    ) => {
      const line = node.loc?.start.line ?? 1,
        endLine = node.loc?.end.line ?? line;
      let kind: BreakdownData['outline'][number]['kind'] | undefined,
        label = '';
      if (node.type === 'Identifier') facts.names.push(String(node.name));
      if (node.type === 'AssignmentExpression') {
        const left = node.left as AstNode,
          right = node.right as AstNode;
        if (left.type === 'ArrayPattern' && right.type === 'ArrayExpression') {
          const a = left.elements as AstNode[],
            b = right.elements as AstNode[];
          const canonical = (n: AstNode) =>
            JSON.stringify(n, (key, value) =>
              ['start', 'end', 'loc'].includes(key) ? undefined : value,
            );
          if (
            a.length === 2 &&
            b.length === 2 &&
            a.every(Boolean) &&
            b.every(Boolean) &&
            canonical(a[0]) === canonical(b[1]) &&
            canonical(a[1]) === canonical(b[0])
          )
            facts.sorting = true;
        }
      }
      if (node.type === 'ArrayExpression') facts.arrays = true;
      if (
        node.type === 'ObjectExpression' ||
        (node.type === 'NewExpression' &&
          ['Map', 'Set'].includes(String((node.callee as AstNode).name)))
      )
        facts.hashing = true;
      if (
        node.type === 'MemberExpression' &&
        ['next', 'left', 'right', 'children', 'neighbors'].includes(
          String((node.property as AstNode).name),
        )
      )
        facts.linked = true;
      if (isFunction(node)) {
        const name = functionName(node, parent);
        const params = (node.params as AstNode[]).map(snippet);
        currentFunction = {
          name,
          line,
          endLine,
          parameters: params,
          returns:
            (node.body as AstNode).type === 'BlockStatement' ? [] : [snippet(node.body as AstNode)],
          recursive: false,
          purpose: `Runs the statements in ${name} with ${params.length} parameter${params.length === 1 ? '' : 's'}.`,
        };
        functions.push(currentFunction);
        kind = 'function';
        label = `${name}(${params.join(', ')})`;
      } else if (
        [
          'ForStatement',
          'ForOfStatement',
          'ForInStatement',
          'WhileStatement',
          'DoWhileStatement',
        ].includes(node.type)
      ) {
        kind = 'loop';
        label = node.type.replace('Statement', '');
        facts.loops++;
        loopDepth++;
        facts.maxLoopDepth = Math.max(facts.maxLoopDepth, loopDepth);
      } else if (['IfStatement', 'SwitchStatement', 'ConditionalExpression'].includes(node.type)) {
        kind = 'branch';
        label =
          node.type === 'IfStatement'
            ? `if ${snippet(node.test as AstNode)}`
            : node.type.replace('Statement', '');
        facts.branches++;
      } else if (['ClassDeclaration', 'ClassExpression'].includes(node.type)) {
        kind = 'class';
        label = `class ${String((node.id as AstNode)?.name ?? '<anonymous>')}`;
      } else if (node.type === 'TryStatement') {
        kind = 'try';
        label = 'try / catch';
      }
      if (kind) outline.push({ id: `js-${outline.length}`, kind, label, line, endLine, depth });
      if (node.type === 'ReturnStatement' && currentFunction) {
        const arg = node.argument as AstNode | null;
        currentFunction.returns.push(arg ? snippet(arg) : 'undefined');
      }
      if (
        node.type === 'CallExpression' &&
        currentFunction &&
        String((node.callee as AstNode).name) === currentFunction.name
      ) {
        currentFunction.recursive = true;
        facts.recursive = true;
      }
      if (node.type.endsWith('Statement') || node.type === 'VariableDeclaration') {
        const text =
          node.type === 'VariableDeclaration'
            ? `Declare ${(node.declarations as AstNode[]).flatMap((d) => bindingNames(d.id as AstNode)).join(', ')}.`
            : node.type === 'ReturnStatement'
              ? `Return ${node.argument ? snippet(node.argument as AstNode) : 'undefined'}.`
              : node.type === 'ExpressionStatement'
                ? `Evaluate ${snippet(node.expression as AstNode)}.`
                : kind
                  ? `${label}.`
                  : `${node.type.replace('Statement', '')}: ${snippet(node)}`;
        if (node.type !== 'BlockStatement' && !annotations.has(line))
          annotations.set(line, { line, text, code: code.split('\n')[line - 1] ?? '' });
      }
      for (const child of children(node))
        walk(child, depth + (kind ? 1 : 0), loopDepth, node, currentFunction);
    };
    walk(root);
    for (const fn of functions)
      if (fn.returns.length)
        fn.purpose = fn.recursive
          ? 'Solves smaller instances through recursive calls and returns the result from the selected path.'
          : fn.returns.length > 1
            ? `Returns a value from one of ${fn.returns.length} paths, depending on control flow.`
            : `Computes and returns ${fn.returns[0]}.`;
    const summary = describeProgram(facts);
    if (functions.length) summary.concepts.push('Functions');
    return {
      ...summary,
      functions,
      outline,
      annotations: [...annotations.values()].sort((a, b) => a.line - b.line),
      diagnostic: null,
    };
  } catch (error) {
    return {
      summary: 'The code could not be parsed. Fix the syntax before building a structure outline.',
      pattern: 'Syntax error',
      functions: [],
      outline: [],
      annotations: [],
      concepts: [],
      diagnostic: error instanceof Error ? error.message : String(error),
    };
  }
}
