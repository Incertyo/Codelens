"""AST-only entry inspection. Does not run the inspected source."""
import ast as _analysis_ast
import json as _analysis_json

def inspect_code(request_json):
    request = _analysis_json.loads(request_json)
    limits = request.get('limits', _codelens_limits)
    code = request['code']
    try:
        tree = _analysis_ast.parse(code, filename='<codelens>')
    except SyntaxError as exc:
        return _analysis_json.dumps(dict(entries=[], moduleCode='', diagnostic=str(exc), preparationReason=None))
    entries, keep, preparation = [], [], None
    def literal(node):
        try:
            _analysis_ast.literal_eval(node)
            return True
        except (ValueError, TypeError):
            return False
    def annotation(node):
        if node is None: return True
        if isinstance(node, _analysis_ast.Constant) and isinstance(node.value, str): return True
        if isinstance(node, _analysis_ast.Name): return node.id in ('int', 'str', 'list', 'bool', 'float', 'None')
        return isinstance(node, _analysis_ast.Subscript) and isinstance(node.value, _analysis_ast.Name) and node.value.id == 'list' and isinstance(node.slice, _analysis_ast.Name) and node.slice.id == 'int'
    for node in tree.body:
        if isinstance(node, (_analysis_ast.FunctionDef, _analysis_ast.AsyncFunctionDef)):
            args = node.args.posonlyargs + node.args.args
            if node.decorator_list or any(not literal(d) for d in node.args.defaults + [d for d in node.args.kw_defaults if d]) or not all(annotation(a.annotation) for a in args + node.args.kwonlyargs) or not annotation(node.returns):
                preparation = 'Decorators, executable defaults and unsupported runtime annotations must be removed before using an isolated entry driver.'
            keep.append(node)
            reason = None
            if isinstance(node, _analysis_ast.AsyncFunctionDef) or len(args) != 1 or node.args.defaults or node.args.kwonlyargs or node.args.vararg or node.args.kwarg or any(isinstance(n, (_analysis_ast.Yield, _analysis_ast.YieldFrom)) for n in _analysis_ast.walk(node)):
                reason = 'Choose a synchronous top-level function with exactly one required parameter. Defaults, keyword-only parameters, rest parameters, generators and async functions are unsupported.'
            p = args[0] if args else None
            text = _analysis_ast.unparse(p.annotation).strip("'\"") if p and p.annotation else ''
            kinds = [] if reason else ['int'] if text == 'int' and p.arg == 'n' else ['list'] if text == 'list[int]' else ['string'] if text == 'str' else ['int', 'list', 'string'] if not text and p.arg == 'n' else ['list', 'string'] if not text else []
            if not kinds and not reason: reason = 'Supported annotations are int n, list[int], and str. An integer entry parameter must be named n.'
            depth, unresolved, allocation = 0, False, False
            def walk(n, level=0):
                nonlocal depth, unresolved, allocation
                if n is not node and isinstance(n, (_analysis_ast.FunctionDef, _analysis_ast.AsyncFunctionDef, _analysis_ast.Lambda)):
                    unresolved = True
                    return
                if isinstance(n, (_analysis_ast.For, _analysis_ast.While, _analysis_ast.ListComp, _analysis_ast.DictComp, _analysis_ast.SetComp)):
                    level += 1; depth = max(depth, level)
                    if isinstance(n, _analysis_ast.While): unresolved = True
                    if isinstance(n, _analysis_ast.For):
                        bound = n.iter
                        if isinstance(bound, _analysis_ast.Call) and isinstance(bound.func, _analysis_ast.Name) and bound.func.id == 'range' and len(bound.args) == 1: bound = bound.args[0]
                        if not isinstance(bound, _analysis_ast.Name) or not p or bound.id != p.arg: unresolved = True
                    if isinstance(n, (_analysis_ast.ListComp, _analysis_ast.DictComp, _analysis_ast.SetComp)): unresolved = True
                if isinstance(n, _analysis_ast.Call) and (not isinstance(n.func, _analysis_ast.Name) or n.func.id not in ('range', 'len', 'int', 'bool', 'float')): unresolved = True
                if isinstance(n, (_analysis_ast.List, _analysis_ast.Dict, _analysis_ast.Set, _analysis_ast.ListComp, _analysis_ast.DictComp, _analysis_ast.SetComp)): allocation = True
                for child in _analysis_ast.iter_child_nodes(n): walk(child, level)
            walk(node)
            entries.append(dict(name=node.name, line=node.lineno, parameter=p.arg if p else '', kinds=kinds, reason=reason,
                time='Unknown' if unresolved else ('O(n' + (('^' + str(depth)) if depth > 1 else '') + ') candidate' if depth else 'O(1) candidate'),
                space='Unknown' if allocation or unresolved else 'O(1) candidate',
                evidence='The AST contains calls, recursion, nested functions or loop bounds this analyzer cannot resolve.' if unresolved else 'AST loop nesting: ' + str(depth) + '. Candidate assumes each loop visits at most n elements, constant-cost expressions and no input mutation changing a loop bound; this is not a proof. Auxiliary space excludes the input.'))
        elif isinstance(node, (_analysis_ast.Import, _analysis_ast.ImportFrom)):
            keep.append(node)
        elif isinstance(node, (_analysis_ast.Assign, _analysis_ast.AnnAssign)):
            targets = node.targets if isinstance(node, _analysis_ast.Assign) else [node.target]
            if node.value is not None and all(isinstance(t, _analysis_ast.Name) for t in targets) and literal(node.value) and (not isinstance(node, _analysis_ast.AnnAssign) or annotation(node.annotation)): keep.append(node)
            else: preparation = 'A top-level binding needs executable initialization. Move that initialization into the selected function before measuring or testing.'
        elif not isinstance(node, (_analysis_ast.Expr, _analysis_ast.Pass)):
            preparation = 'Top-level control flow and classes are unsupported by the isolated entry driver.'
    lines = code.split('\n')
    for entry in entries:
        if sum(e['name'] == entry['name'] for e in entries) > 1:
            entry['reason'] = 'Duplicate top-level function names are ambiguous. Use unique names before selecting an entry.'
            entry['kinds'] = []
    kept_lines = {i for n in keep for i in range(n.lineno, n.end_lineno + 1)}
    if any(n not in keep and any(i in kept_lines for i in range(n.lineno, n.end_lineno + 1)) for n in tree.body): preparation = 'Several top-level statements share a retained source line. Put the demo driver on separate lines before measuring.'
    module = ['' for _ in lines]
    for node in keep:
        for i in range(node.lineno - 1, node.end_lineno): module[i] = lines[i]
    return _analysis_json.dumps(dict(entries=entries[:limits['inspectionEntries']], moduleCode='\n'.join(module), diagnostic=None, preparationReason=preparation))
