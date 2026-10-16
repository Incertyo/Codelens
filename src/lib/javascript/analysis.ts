import { children, isFunction, parseProgram, type AstNode } from './ast';
import type { Inspection, Entry } from '../analysis';
const literal = (n: AstNode | null): boolean =>
  !!n &&
  (n.type === 'Literal' ||
    (n.type === 'UnaryExpression' && literal(n.argument as AstNode)) ||
    (n.type === 'ArrayExpression' && (n.elements as AstNode[]).every(literal)));
export function inspectJavaScript(code: string, prepared?: AstNode): Inspection {
  try {
    const root = prepared ?? parseProgram(code),
      entries: Entry[] = [],
      keep: AstNode[] = [];
    let preparationReason: string | null = null;
    const register = (fn: AstNode, name: string) => {
      const params = fn.params as AstNode[],
        p = params[0];
      const reason =
        fn.async || fn.generator || params.length !== 1 || p?.type !== 'Identifier'
          ? 'Choose a synchronous top-level function with exactly one required identifier parameter. Defaults, rest, destructuring, generators and async functions are unsupported.'
          : null;
      let maxDepth = 0,
        unresolved = false,
        allocation = false;
      const walk = (n: AstNode, depth = 0) => {
        if (n !== fn && isFunction(n)) {
          unresolved = true;
          return;
        }
        if (
          [
            'ForStatement',
            'ForOfStatement',
            'ForInStatement',
            'WhileStatement',
            'DoWhileStatement',
          ].includes(n.type)
        ) {
          depth++;
          maxDepth = Math.max(depth, maxDepth);
          if (!['ForOfStatement', 'ForStatement'].includes(n.type)) unresolved = true;
          const bound =
            n.type === 'ForOfStatement' ? n.right : (n.test as AstNode | undefined)?.right;
          const inputBound = isNodeInput(bound as AstNode | undefined, String(p?.name ?? ''));
          if (!inputBound) unresolved = true;
        }
        if (n.type === 'CallExpression') {
          const callee = n.callee as AstNode;
          if (
            callee.type !== 'Identifier' ||
            !['Number', 'String', 'Boolean'].includes(String(callee.name))
          )
            unresolved = true;
        }
        if (['ArrayExpression', 'ObjectExpression', 'NewExpression'].includes(n.type))
          allocation = true;
        children(n).forEach((c) => walk(c, depth));
      };
      walk(fn);
      entries.push({
        name,
        line: fn.loc?.start.line ?? 1,
        parameter: String(p?.name ?? ''),
        kinds: reason ? [] : p.name === 'n' ? ['int', 'list', 'string'] : ['list', 'string'],
        reason,
        time: unresolved
          ? 'Unknown'
          : maxDepth
            ? `O(n${maxDepth === 1 ? '' : `^${maxDepth}`}) candidate`
            : 'O(1) candidate',
        space: allocation || unresolved ? 'Unknown' : 'O(1) candidate',
        evidence: unresolved
          ? 'The AST contains calls, recursion, nested functions or loop bounds that this analyzer cannot resolve.'
          : 'AST loop nesting: ' +
            maxDepth +
            '. Candidate assumes each loop visits at most n elements, constant-cost expressions and no input mutation changing a loop bound; this is not a proof. Auxiliary space excludes the input.',
      });
    };
    for (const n of root.body as AstNode[]) {
      if (n.type === 'FunctionDeclaration') {
        keep.push(n);
        register(n, String((n.id as AstNode).name));
      } else if (n.type === 'VariableDeclaration') {
        const declarations = n.declarations as AstNode[];
        if (
          declarations.every(
            (d) =>
              (d.id as AstNode).type === 'Identifier' &&
              (!d.init || isFunction(d.init as AstNode) || literal(d.init as AstNode)),
          )
        ) {
          keep.push(n);
          for (const d of declarations)
            if (d.init && isFunction(d.init as AstNode))
              register(d.init as AstNode, String((d.id as AstNode).name));
        } else
          preparationReason =
            'A top-level binding needs executable initialization. Move that initialization into the selected function before measuring or testing.';
      } else if (n.type !== 'ExpressionStatement' && n.type !== 'EmptyStatement')
        preparationReason =
          'Top-level control flow, classes and other executable declarations are unsupported by the isolated entry driver.';
    }

    const chars: string[] = code.split('').map((c) => (c === '\n' ? '\n' : ' '));
    for (const n of keep) for (let i = n.start ?? 0; i < (n.end ?? 0); i++) chars[i] = code[i];
    for (const entry of entries)
      if (entries.filter((e) => e.name === entry.name).length > 1) {
        entry.reason =
          'Duplicate top-level function names are ambiguous. Use unique names before selecting an entry.';
        entry.kinds = [];
      }
    return {
      entries: entries.slice(0, 40),
      moduleCode: chars.join(''),
      diagnostic: null,
      preparationReason,
    };
  } catch (error) {
    return {
      entries: [],
      moduleCode: '',
      diagnostic: error instanceof Error ? error.message : 'Invalid JavaScript.',
      preparationReason: null,
    };
  }
}
function isNodeInput(node: AstNode | undefined, name: string): boolean {
  return (
    !!node &&
    ((node.type === 'Identifier' && node.name === name) ||
      (node.type === 'MemberExpression' &&
        (node.object as AstNode).type === 'Identifier' &&
        (node.object as AstNode).name === name &&
        (node.property as AstNode).name === 'length'))
  );
}
