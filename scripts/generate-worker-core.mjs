import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';

const modules = await Promise.all(['limits', 'worker-protocol'].map(async (name) => {
  const source = await readFile(`src/shared/${name}.ts`, 'utf8');
  return ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, removeComments: true },
  }).outputText;
}));
await writeFile('public/worker-core.js', `(() => { const exports = {};\n${modules.join('\n')}\nself.codelensWorkerCore = Object.freeze(exports); })();\n`);
