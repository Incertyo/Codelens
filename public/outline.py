"""Parse user source without executing it. Only AST facts leave the worker."""
import ast as _ast

def outline_code(request_json):
    request = _json.loads(request_json)
    limits = request.get('limits', _codelens_limits)
    code = request['code']
    try:
        tree = _ast.parse(code, filename='<codelens>')
    except SyntaxError as exc:
        return _json.dumps({'summary': 'The code could not be parsed. Fix the syntax before building a structure outline.', 'pattern': 'Syntax error', 'functions': [], 'outline': [], 'annotations': [], 'concepts': [], 'diagnostic': 'SyntaxError: ' + str(exc)})
    nodes, functions, annotations = [], [], {}
    facts = {'names': [], 'loops': 0, 'maxLoopDepth': 0, 'branches': 0, 'arrays': False, 'hashing': False, 'linked': False, 'recursive': False}
    lines = code.splitlines()
    def segment(node):
        return (_ast.get_source_segment(code, node) or type(node).__name__).replace('\n', ' ')[:limits['outlineSnippetCharacters']]
    def walk(node, depth=0, loop_depth=0, fn=None, parent=None):
        line, end = getattr(node, 'lineno', 1), getattr(node, 'end_lineno', 1)
        kind, label = None, ''
        if isinstance(node, _ast.Name): facts['names'].append(node.id)
        if isinstance(node, _ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], _ast.Tuple) and isinstance(node.value, _ast.Tuple):
            a, b = node.targets[0].elts, node.value.elts
            if len(a) == len(b) == 2 and _ast.unparse(a[0]) == _ast.unparse(b[1]) and _ast.unparse(a[1]) == _ast.unparse(b[0]): facts['sorting'] = True
        if isinstance(node, (_ast.List, _ast.ListComp)): facts['arrays'] = True
        if isinstance(node, (_ast.Dict, _ast.Set, _ast.DictComp, _ast.SetComp)): facts['hashing'] = True
        if isinstance(node, _ast.Call) and isinstance(node.func, _ast.Name) and node.func.id in ('set', 'dict'): facts['hashing'] = True
        if isinstance(node, _ast.Attribute) and node.attr in ('next', 'left', 'right', 'children', 'neighbors'): facts['linked'] = True
        if isinstance(node, (_ast.FunctionDef, _ast.AsyncFunctionDef, _ast.Lambda)):
            params = [a.arg for a in node.args.posonlyargs + node.args.args + node.args.kwonlyargs]
            if node.args.vararg: params.append('*' + node.args.vararg.arg)
            if node.args.kwarg: params.append('**' + node.args.kwarg.arg)
            name = getattr(node, 'name', '<lambda>')
            if isinstance(node, _ast.Lambda) and isinstance(parent, _ast.Assign) and len(parent.targets) == 1 and isinstance(parent.targets[0], _ast.Name): name = parent.targets[0].id
            fn = {'name': name, 'line': line, 'endLine': end, 'parameters': params, 'returns': [segment(node.body)] if isinstance(node, _ast.Lambda) else [], 'recursive': False, 'purpose': 'Runs the statements in ' + name + '.'}
            functions.append(fn); kind, label = 'function', name + '(' + ', '.join(params) + ')'
        elif isinstance(node, (_ast.For, _ast.While, _ast.AsyncFor)):
            kind, label = 'loop', ('for ' + segment(node.target) + ' in ' + segment(node.iter)) if isinstance(node, (_ast.For, _ast.AsyncFor)) else 'while ' + segment(node.test)
            facts['loops'] += 1; loop_depth += 1; facts['maxLoopDepth'] = max(facts['maxLoopDepth'], loop_depth)
        elif isinstance(node, (_ast.If, _ast.IfExp, _ast.Match)):
            kind, label = 'branch', 'if ' + segment(node.test) if hasattr(node, 'test') else 'match'; facts['branches'] += 1
        elif isinstance(node, _ast.ClassDef): kind, label = 'class', 'class ' + node.name
        elif isinstance(node, (_ast.Try, _ast.TryStar)): kind, label = 'try', 'try / except'
        if kind: nodes.append({'id': 'py-' + str(len(nodes)), 'kind': kind, 'label': label, 'line': line, 'endLine': end, 'depth': depth})
        if isinstance(node, _ast.Return) and fn: fn['returns'].append(segment(node.value) if node.value else 'None')
        if isinstance(node, _ast.Call) and fn and isinstance(node.func, _ast.Name) and node.func.id == fn['name']:
            fn['recursive'] = True; facts['recursive'] = True
        if isinstance(node, _ast.stmt) and line not in annotations:
            text = label + '.' if kind else ('Return ' + segment(node.value) + '.' if isinstance(node, _ast.Return) and node.value else type(node).__name__ + ': ' + segment(node))
            annotations[line] = {'line': line, 'text': text, 'code': lines[line - 1] if line <= len(lines) else ''}
        for child in _ast.iter_child_nodes(node): walk(child, depth + (1 if kind else 0), loop_depth, fn, node)
    walk(tree)
    for fn in functions:
        if fn['returns']: fn['purpose'] = 'Solves smaller instances through recursive calls and returns the result from the selected path.' if fn['recursive'] else ('Returns a value from one of ' + str(len(fn['returns'])) + ' paths, depending on control flow.' if len(fn['returns']) > 1 else 'Computes and returns ' + fn['returns'][0] + '.')
    return _json.dumps({'facts': facts, 'functions': functions, 'outline': nodes, 'annotations': sorted(annotations.values(), key=lambda a: a['line']), 'diagnostic': None})
