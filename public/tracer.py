"""Local, language-neutral trace snapshots. This file is loaded before user execution."""
import sys as _sys
import json as _json
import io as _io
import time as _time
import types as _types
import builtins as _builtins
import collections as _collections
import queue as _queue
from itertools import islice as _islice


class _TraceLimit(BaseException):
    pass


def run_trace(request_json):
    request = _json.loads(request_json)
    limits = request.get('limits', _codelens_limits)
    limit = min(limits['steps'], max(limits['workerMinSteps'], int(request.get('maxSteps', limits['steps']))))
    steps = []
    identities = {}
    retained = []
    frame_ids = {}
    call_count = 0
    output = _io.StringIO()
    input_stream = _io.StringIO(request.get('stdin', ''))
    started = _time.perf_counter()
    error = None
    truncated = False
    limit_hit = False
    serialized_bytes = 2
    byte_limit = limits['traceBytes']
    limit_message = 'Trace stopped at the safety limit. The program may contain an infinite loop.'
    environment = {'__name__': '__main__'}

    def snapshot(frame, event, arg=None, message=None):
        nonlocal serialized_bytes, limit_hit, limit_message
        heap = {}

        def value(obj, depth=0):
            if obj is None or isinstance(obj, bool):
                return obj
            if isinstance(obj, int):
                if obj.bit_length() > limits['integerBits']:
                    return '[large integer: ' + str(int(obj.bit_length() * 0.30103) + 1) + ' digits]'
                return obj if abs(obj) <= limits['safeInteger'] else str(obj)[:limits['valueCharacters']] + ('…' if len(str(obj)) > limits['valueCharacters'] else '')
            if isinstance(obj, float):
                return obj if obj == obj and abs(obj) != float('inf') else str(obj)
            if isinstance(obj, str):
                return obj[:limits['valueCharacters']] + ('…' if len(obj) > limits['valueCharacters'] else '')
            identity = id(obj)
            if identity not in identities:
                identities[identity] = 'h' + str(len(identities) + 1)
                retained.append(obj)                                                         
            ref = identities[identity]
            if ref in heap:
                return {'ref': ref}
            if len(heap) >= limits['heapObjects'] or depth >= limits['snapshotDepth']:
                return '[value truncated]'
            record = {'type': type(obj).__name__}
            heap[ref] = record
            if isinstance(obj, (list, tuple, set, frozenset, _collections.deque)):
                items = list(_islice(obj, limits['collectionElements'])) if not isinstance(obj, (list, tuple)) else obj[:limits['collectionElements']]
                record['items'] = [value(item, depth + 1) for item in items]
                record['truncated'] = len(obj) > limits['collectionElements']
            elif isinstance(obj, _queue.Queue):
                record['items'] = [value(item, depth + 1) for item in _islice(obj.queue, limits['collectionElements'])]
                record['truncated'] = len(obj.queue) > limits['collectionElements']
            elif isinstance(obj, dict):
                record['entries'] = []
                for i, (key, item) in enumerate(obj.items()):
                    if i >= limits['collectionElements']:
                        break
                    record['entries'].append([value(key, depth + 1), value(item, depth + 1)])
                record['truncated'] = len(obj) > limits['collectionElements']
            else:
                try:
                    fields = object.__getattribute__(obj, '__dict__')
                    record['fields'] = {str(k): value(v, depth + 1) for k, v in _islice(fields.items(), limits['collectionElements'])}
                except (AttributeError, TypeError):
                    slots = {}
                    for cls in type(obj).__mro__:
                        for key, descriptor in cls.__dict__.items():
                            if len(slots) >= limits['collectionElements']: break
                            if isinstance(descriptor, _types.MemberDescriptorType) and not key.startswith('__'):
                                try: slots[key] = value(descriptor.__get__(obj, type(obj)), depth + 1)
                                except (AttributeError, TypeError): pass
                    record['fields'] = slots or {'value': '<' + type(obj).__name__ + '>'}
            return {'ref': ref}

        def variables(mapping):
            result = {}
            for key, obj in mapping.copy().items():
                if key.startswith('__') or isinstance(obj, (_types.ModuleType, _types.FunctionType, _types.BuiltinFunctionType, type)):
                    continue
                if len(result) >= limits['variables']:
                    result['…'] = 'Additional variables truncated'
                    break
                result[key] = value(obj)
            return result

        frames = []
        cursor = frame
        while cursor is not None:
            if cursor.f_code.co_filename == '<codelens>':
                frames.append(cursor)
            cursor = cursor.f_back
        stack = [{'id': frame_ids.get(id(f), 'module'), 'func': f.f_code.co_name, 'line': max(1, f.f_lineno), 'locals': variables(f.f_locals)} for f in reversed(frames[:limits['frames']])]
        if event == 'return' and stack:
            stack[-1]['locals']['↳ return'] = value(arg)
        step = {'index': len(steps), 'line': max(1, frame.f_lineno) if frame else 1,
                'event': event, 'func': frame.f_code.co_name if frame else '<module>',
                'callStack': stack, 'globals': variables(environment), 'heap': heap,
                'stdout': output.getvalue()}
        if message:
            step['explanation'] = message
        size = len(_json.dumps(step, ensure_ascii=True).encode('utf-8')) + 1
        if serialized_bytes + size > byte_limit - limits['traceNoticeBytes']:
            limit_hit = True
            limit_message = 'Trace stopped at the serialized-size safety limit.'
            raise _TraceLimit()
        serialized_bytes += size
        steps.append(step)

    def trace(frame, event, arg):
        nonlocal call_count, limit_hit
        if frame.f_code.co_filename != '<codelens>':
            return trace
        if event == 'call':
            call_count += 1
            frame_ids[id(frame)] = 'c' + str(call_count)
        if limit_hit or len(steps) >= limit - 1:
            limit_hit = True
            raise _TraceLimit()
        if _time.perf_counter() - started > limits['traceTimeoutMs'] / 1000:
            limit_hit = True
            raise _TraceLimit()
        if event in ('line', 'call', 'return'):
            snapshot(frame, event, arg)
        elif event == 'exception':
            snapshot(frame, event, message=type(arg[1]).__name__ + ': ' + str(arg[1])[:limits['exceptionCharacters']])
        return trace

    class Writer:
        def write(self, text):
            room = max(0, limits['stdout'] - output.tell())
            if room:
                output.write(str(text)[:room])
            if len(steps) < limit - 1:
                frame = _sys._getframe(1)
                while frame and frame.f_code.co_filename != '<codelens>':
                    frame = frame.f_back
                if frame:
                    snapshot(frame, 'output')
            return len(text)

        def flush(self):
            pass

    original_import = _builtins.__import__

    def safe_import(name, *args, **kwargs):
        if name.split('.')[0] in ('js', 'pyodide', '_pyodide', 'pyodide_js', 'micropip'):
            raise ImportError('Browser bridge and package downloads are disabled in the sandbox.')
        return original_import(name, *args, **kwargs)

    user_builtins = dict(vars(_builtins))
    user_builtins['__import__'] = safe_import
    environment['__builtins__'] = user_builtins
    old_out, old_err, old_in = _sys.stdout, _sys.stderr, _sys.stdin
    try:
        _sys.stdout = _sys.stderr = Writer()
        _sys.stdin = input_stream
        compiled = compile(request['code'], '<codelens>', 'exec')
        _sys.settrace(trace)
        exec(compiled, environment, environment)
    except _TraceLimit:
        limit_hit = True
    except BaseException as exc:
        _sys.settrace(None)
        error = type(exc).__name__ + ': ' + str(exc)[:limits['errorCharacters']]
        tb = exc.__traceback__
        frame = None
        error_line = getattr(exc, 'lineno', None)
        while tb:
            if tb.tb_frame.f_code.co_filename == '<codelens>':
                frame, error_line = tb.tb_frame, tb.tb_lineno
            tb = tb.tb_next
        if len(steps) >= limit:
            steps.pop()
        try:
            snapshot(frame, 'exception', message=error)
            steps[-1]['line'] = max(1, error_line or 1)
        except _TraceLimit:
            limit_hit = True
    finally:
        _sys.settrace(None)
        _sys.stdout, _sys.stderr, _sys.stdin = old_out, old_err, old_in
    if limit_hit:
        truncated = True
        error = None
        if len(steps) >= limit:
            steps.pop()
        last = {'line': steps[-1]['line'] if steps else 1, 'func': steps[-1]['func'] if steps else '<module>', 'callStack': [], 'globals': {}, 'heap': {}, 'stdout': steps[-1]['stdout'] if steps else ''}
        last.update(index=len(steps), event='exception', explanation=limit_message)
        steps.append(last)
    return _json.dumps({'steps': steps, 'truncated': truncated, 'error': error,
                        'elapsed': round((_time.perf_counter() - started) * 1000)}, ensure_ascii=True)
