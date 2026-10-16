import ast as _measure_ast
import builtins as _measure_builtins
import collections as _measure_collections
import io as _measure_io
import json as _measure_json
import sys as _measure_sys
import time as _measure_time
import types as _measure_types


def measure_code(request_json):
    request = _measure_json.loads(request_json)
    limits = request.get('limits', _codelens_limits)
    options = request['options']
    environment = {'__name__': '__main__'}
    counters = {'events': 0, 'lines': 0, 'peak': 0, 'input': 0, 'samples': 0}
    state = {'exhausted': False, 'partial': False, 'entered': False, 'active': False}
    started = _measure_time.perf_counter()
    filename = '<codelens-measurement>'
    error = None

    class Limit(BaseException):
        pass

    def check():
        if state['exhausted'] or counters['events'] >= options['eventBudget'] or (_measure_time.perf_counter() - started) * 1000 >= options['timeoutMs']:
            state['exhausted'] = True
            raise Limit()
        counters['events'] += 1

    def units(roots, bindings=0, frames=0):
        total, visits = bindings + frames, 0
        seen, strings = set(), set()
        pending = [(value, 0) for value in roots]
        while pending:
            visits += 1
            if visits > options['maxVisits']:
                state['partial'] = True
                break
            value, depth = pending.pop()
            if isinstance(value, str):
                if value not in strings:
                    total += min(limits['measurementString'], len(value))
                strings.add(value)
                continue
            if value is None or isinstance(value, (bool, int, float, complex, _measure_types.ModuleType, _measure_types.FunctionType, _measure_types.BuiltinFunctionType, type)):
                continue
            identity = id(value)
            if identity in seen:
                continue
            if len(seen) >= options['maxObjects'] or depth >= options['maxDepth']:
                state['partial'] = True
                break
            seen.add(identity)
            total += 1

            def enqueue(item):
                if len(pending) + visits >= options['maxVisits']:
                    state['partial'] = True
                    return False
                pending.append((item, depth + 1))
                return True

            if isinstance(value, (bytes, bytearray, memoryview)):
                total += len(value)
            elif isinstance(value, (list, tuple, set, frozenset, _measure_collections.deque)):
                total += len(value)
                iterator = list.__iter__(value) if isinstance(value, list) else tuple.__iter__(value) if isinstance(value, tuple) else set.__iter__(value) if isinstance(value, set) else frozenset.__iter__(value) if isinstance(value, frozenset) else _measure_collections.deque.__iter__(value)
                for item in iterator:
                    if not enqueue(item):
                        break
            elif isinstance(value, dict):
                total += len(value)
                for key, item in dict.items(value):
                    if not enqueue(key) or not enqueue(item):
                        break
            else:
                try:
                    fields = object.__getattribute__(value, '__dict__')
                except (AttributeError, TypeError):
                    fields = {}
                for item in fields.values():
                    total += 1
                    if not enqueue(item):
                        break
                for cls in type(value).__mro__:
                    for name, descriptor in cls.__dict__.items():
                        if isinstance(descriptor, _measure_types.MemberDescriptorType):
                            try:
                                item = descriptor.__get__(value, type(value))
                            except (AttributeError, TypeError):
                                continue
                            total += 1
                            if not enqueue(item):
                                break
            if visits & 255 == 0 and (_measure_time.perf_counter() - started) * 1000 >= options['timeoutMs']:
                state['exhausted'] = True
                raise Limit()
        return total

    def sample(frame, returned=None):
        if not state['active'] or state['partial']:
            return
        roots, bindings, frames = [], 0, 0
        mappings = [environment]
        cursor = frame
        while cursor is not None:
            if cursor.f_code.co_filename == filename and cursor.f_code.co_name != '<module>':
                mappings.append(cursor.f_locals)
                frames += 1
            cursor = cursor.f_back
        for mapping in mappings:
            for name, value in mapping.items():
                if name in ('__name__', '__builtins__'):
                    continue
                bindings += 1
                roots.append(value)
        if returned is not None:
            roots.append(returned)
        counters['samples'] += 1
        counters['peak'] = max(counters['peak'], units(roots, bindings, frames))

    def trace(frame, event, arg):
        if frame.f_code.co_filename != filename:
            return None
        if event not in ('line', 'call', 'return', 'exception'):
            return trace
        check()
        user = frame.f_code.co_name != '<module>'
        if event == 'call' and not state['entered'] and frame.f_code.co_name == request['entry']:
            state['entered'] = state['active'] = True
            counters['input'] = units(request['args'])
            request['args'] = []
        if not user or not state['active']:
            return trace
        if event == 'line':
            counters['lines'] += 1
        if event in ('call', 'return') or (event == 'line' and (counters['lines'] <= options['sampleEvery'] or counters['lines'] % options['sampleEvery'] == 0)):
            sample(frame, arg if event == 'return' else None)
        return trace

    original_import = _measure_builtins.__import__

    def safe_import(name, *args, **kwargs):
        if name.split('.')[0] in ('js', 'pyodide', '_pyodide', 'pyodide_js', 'micropip'):
            raise ImportError('Browser bridge and package downloads are disabled in the sandbox.')
        return original_import(name, *args, **kwargs)

    class Writer:
        def write(self, text):
            return len(text)

        def flush(self):
            pass

    user_builtins = dict(vars(_measure_builtins))
    user_builtins['__import__'] = safe_import
    environment['__builtins__'] = user_builtins
    old_out, old_err, old_in = _measure_sys.stdout, _measure_sys.stderr, _measure_sys.stdin
    try:
        inspection = _measure_json.loads(inspect_code(_measure_json.dumps({'code': request['code']})))
        if inspection['diagnostic'] or inspection['preparationReason']:
            raise ValueError(inspection['diagnostic'] or inspection['preparationReason'])
        entries = [entry for entry in inspection['entries'] if entry['name'] == request['entry']]
        if len(entries) != 1 or not request['entry'].isidentifier():
            raise ValueError('Choose a unique named top-level entry function.')
        tree = _measure_ast.parse(inspection['moduleCode'])
        target = next(node for node in tree.body if isinstance(node, (_measure_ast.FunctionDef, _measure_ast.AsyncFunctionDef)) and node.name == request['entry'])
        if isinstance(target, _measure_ast.AsyncFunctionDef) or any(isinstance(node, (_measure_ast.Yield, _measure_ast.YieldFrom)) for node in _measure_ast.walk(target)):
            raise ValueError('Measurement requires a synchronous entry function.')
        _measure_sys.stdout = _measure_sys.stderr = Writer()
        _measure_sys.stdin = _measure_io.StringIO('')
        _measure_sys.settrace(trace)
        exec(compile(inspection['moduleCode'], filename, 'exec'), environment, environment)
        arguments = request['args']
        environment[request['entry']](*arguments)
        if not state['entered']:
            raise ValueError('The selected entry produced no user function calls.')
    except Limit:
        state['exhausted'] = True
    except BaseException as exc:
        error = type(exc).__name__ + ': ' + str(exc)[:limits['errorCharacters']]
    finally:
        _measure_sys.settrace(None)
        _measure_sys.stdout, _measure_sys.stderr, _measure_sys.stdin = old_out, old_err, old_in
    return _measure_json.dumps({
        'n': request['n'],
        'status': 'budget-exceeded' if state['exhausted'] else 'error' if error else 'partial' if state['partial'] else 'complete',
        'lineEvents': counters['lines'], 'events': counters['events'], 'totalPeak': counters['peak'],
        'auxiliaryPeak': max(0, counters['peak'] - counters['input']), 'inputUnits': counters['input'], 'samples': counters['samples'],
        'reason': 'Measurement event or execution-time budget exceeded.' if state['exhausted'] else error if error else 'Memory traversal bound reached; this size is partial and excluded from fits.' if state['partial'] else None,
    })
