import path from 'node:path';
import { limits } from '../src/shared/limits.ts';

const normalize = value => value.replaceAll('\\', '/');
const sourcePath = (value, file) => value.startsWith('@/')
  ? normalize(path.resolve('src', value.slice(2)))
  : value.startsWith('.') ? normalize(path.resolve(path.dirname(file), value)) : value;
const feature = value => value.match(/\/src\/features\/([^/]+)\//)?.[1];

const boundaries = {
  meta: { type: 'problem', schema: [], messages: {
    shared: 'Shared modules cannot import feature implementations.',
    public: 'Import another feature through its public entry points.',
    server: 'Client modules cannot import server-only implementations.',
    worker: 'Workers cannot import React, Next, UI or DOM libraries.',
    legacy: 'Application implementations must not import legacy compatibility entry points.',
  } },
  create(context) {
    const file = normalize(context.filename);
    const ownFeature = feature(file);
    const client = context.sourceCode.ast.body.some(node => node.type === 'ExpressionStatement' && node.directive === 'use client');
    const server = file.includes('/server/');
    const inspect = node => {
      const value = node.value;
      if (typeof value !== 'string') return;
      const target = sourcePath(value, file);
      const targetFeature = feature(target);
      let messageId;
      if (file.includes('/src/shared/') && (targetFeature || /\/src\/lib\//.test(target))) messageId = 'shared';
      else if (ownFeature && targetFeature && ownFeature !== targetFeature && !target.includes('/public/')) messageId = 'public';
      else if ((client || ownFeature && !server && !file.includes('/public/server/')) && target.includes('/server/')) messageId = 'server';
      else if (file.includes('/workers/') && (/^(react(?:-dom)?|next)(\/|$)/.test(value) || /monaco-editor|\/components\/|\/public\/.*(?:code-editor|workspace|preferences|page-intro)/.test(target))) messageId = 'worker';
      else if (ownFeature && /\/src\/lib\//.test(target) && !/\/(algorithm-catalog|examples|additional-examples)$/.test(target)) messageId = 'legacy';
      if (messageId) context.report({ node, messageId });
    };
    return {
      ImportDeclaration: node => inspect(node.source),
      ExportNamedDeclaration: node => { if (node.source) inspect(node.source); },
      ExportAllDeclaration: node => inspect(node.source),
      ImportExpression: node => inspect(node.source),
      TSImportType: node => { if (node.argument?.type === 'TSLiteralType') inspect(node.argument.literal); else if (node.source) inspect(node.source); },
    };
  },
};

const limitOwner = {
  meta: { type: 'problem', schema: [], messages: { limit: 'Use the named shared limit rather than repeating its numeric cap.' } },
  create(context) {
    const file = normalize(context.filename);
    if (file.endsWith('/shared/limits.ts') || file.includes('/src/lib/') || file.includes('/generated/')) return {};
    const caps = new Set([
      limits.code, limits.stdin, limits.steps, limits.runTimeoutMs, limits.runtimeTimeoutMs,
      limits.traceTimeoutMs, limits.stdout, limits.traceBytes, limits.traceNoticeBytes,
      limits.measurementEvents, limits.measurementObjects, limits.measurementVisits,
      limits.measurementN, limits.measurementRequestBytes, limits.aiDeadlineMs,
      limits.aiOutputTokens, limits.aiBodyBytes, limits.shareFragment, limits.shareJson,
    ]);
    const snapshotCaps = new Set([limits.variables, limits.heapObjects, limits.valueCharacters, limits.snapshotDepth]);
    return { Literal(node) {
      if (typeof node.value !== 'number') return;
      const parent = node.parent;
      const snapshotFile = /\/(runtime|trace|measurement|detectors|structures|breakdown|analysis)\.(ts|tsx)$/.test(file);
      const capCall = parent.type === 'CallExpression' && parent.callee.type === 'MemberExpression' &&
        ['max', 'slice', 'substring'].includes(parent.callee.property.name) &&
        !(parent.callee.object.type === 'Identifier' && parent.callee.object.name === 'Math');
      if (caps.has(node.value) || snapshotFile && capCall && snapshotCaps.has(node.value)) context.report({ node, messageId: 'limit' });
    } };
  },
};

const architecturePlugin = { rules: { boundaries, 'limit-owner': limitOwner } };
export default architecturePlugin;
