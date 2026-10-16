import path from 'node:path';

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
      if (file.includes('/src/shared/') && targetFeature) messageId = 'shared';
      else if (ownFeature && targetFeature && ownFeature !== targetFeature && !target.includes('/public/')) messageId = 'public';
      else if ((client || ownFeature && !server && !file.includes('/public/server/')) && target.includes('/server/')) messageId = 'server';
      else if (file.includes('/workers/') && (/^(react(?:-dom)?|next)(\/|$)/.test(value) || /monaco-editor|\/components\/|\/public\/.*(?:code-editor|workspace|preferences|page-intro)/.test(target))) messageId = 'worker';
      else if (ownFeature && /\/src\/lib\//.test(target) && !/\/(algorithm-catalog|examples|javascript-examples|additional-examples)$/.test(target)) messageId = 'legacy';
      if (messageId) context.report({ node, messageId });
    };
    return {
      ImportDeclaration: node => inspect(node.source),
      ExportNamedDeclaration: node => { if (node.source) inspect(node.source); },
      ExportAllDeclaration: node => inspect(node.source),
      ImportExpression: node => inspect(node.source),
    };
  },
};

const limitOwner = {
  meta: { type: 'problem', schema: [], messages: { limit: 'Use the named shared limit rather than repeating its numeric cap.' } },
  create(context) {
    const file = normalize(context.filename);
    if (file.endsWith('/shared/limits.ts') || file.includes('/src/lib/') || file.includes('/generated/')) return {};
    const caps = new Set([30000, 5000, 12000, 90000, 1048576, 16777216, 18000, 3500]);
    return { Literal(node) {
      if (typeof node.value === 'number' && caps.has(node.value)) context.report({ node, messageId: 'limit' });
    } };
  },
};

export default { rules: { boundaries, 'limit-owner': limitOwner } };
