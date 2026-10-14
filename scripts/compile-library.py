"""Extract dependency-complete programs from our authored, trusted Python sources.
This is a maintenance command, never a request handler or user-code runner.
Each DEMOS entry is (call expression, independently specified expected result).
"""
import ast
import contextlib
import io
import json
from pathlib import Path


def compile_programs():
    programs = []
    for path in sorted(Path('library/python').glob('*.py')):
        text = path.read_text(encoding='utf-8')
        tree = ast.parse(text)
        definitions = {node.name: node for node in tree.body if isinstance(node, (ast.FunctionDef, ast.ClassDef))}
        imports = [node for node in tree.body if isinstance(node, (ast.Import, ast.ImportFrom))]
        demo_node = next(node for node in tree.body if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'DEMOS' for t in node.targets))
        demos = ast.literal_eval(demo_node.value)
        for slug, (call, expected) in demos.items():
            required = set()
            def visit(node):
                for child in ast.walk(node):
                    if isinstance(child, ast.Name) and child.id in definitions and child.id not in required:
                        required.add(child.id)
                        visit(definitions[child.id])
            visit(ast.parse(call))
            if not required:
                raise ValueError(f'{slug}: no algorithm function invoked')
            selected = imports + [node for name, node in definitions.items() if name in required]
            selected.sort(key=lambda node: node.lineno)
            code = '# ' + slug + '\n# Edit the demonstration input below, then Run.\nimport json\n\n'
            code += '\n\n'.join(ast.get_source_segment(text, node) for node in selected)
            code += '\n\n# Demonstration input\nresult = ' + call + '\nprint(json.dumps(result, sort_keys=True))\n'
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                exec(compile(code, str(path), 'exec'), {})
            actual = json.loads(output.getvalue())
            normalized = json.loads(json.dumps(expected))
            if actual != normalized:
                raise AssertionError(f'{slug}: expected {normalized!r}, got {actual!r}')
            if len(code) > 30000:
                raise ValueError(f'{slug}: source exceeds editor limit')
            programs.append({'slug': slug, 'code': code, 'expected': output.getvalue(), 'sourceFile': path.as_posix(), 'entryPoint': call, 'notes': [ast.get_docstring(node) for name, node in definitions.items() if name in required and ast.get_docstring(node)]})
    return programs


if __name__ == '__main__':
    print(json.dumps(compile_programs(), ensure_ascii=True))
