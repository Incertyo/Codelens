import type { Route } from '@playwright/test';

export async function fulfillNotes(route: Route) {
  const body = route.request().postDataJSON();
  if (body.mode === 'analysis') return false;
  await route.fulfill({ json: { source: 'ai', enrichment: {
    summary: 'Fixture source notes.', pattern: 'Function evaluation',
    functions: body.functions.map(({ name, line }: { name: string; line: number }) => ({ name, line, purpose: '', returns: '' })),
    annotations: [], stepNotes: [],
  } } });
  return true;
}
