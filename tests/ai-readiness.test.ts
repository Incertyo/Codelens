import { afterEach, expect, it, vi } from 'vitest';
import { checkAIReadiness } from '../src/lib/ai/readiness-client';

afterEach(() => vi.unstubAllGlobals());

it('checks readiness without sending source or consuming a POST', async () => {
  const fetch = vi.fn(async () => Response.json({ configured: true, reason: null }));
  vi.stubGlobal('fetch', fetch);
  expect(await checkAIReadiness()).toEqual({ configured: true, reason: '' });
  expect(fetch).toHaveBeenCalledWith(
    '/api/analyze',
    expect.objectContaining({ cache: 'no-store' }),
  );
  expect(fetch.mock.calls[0]).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ body: expect.anything() })]),
  );
});

it('preserves the specific daily-budget pause', async () => {
  vi.stubGlobal('fetch', async () =>
    Response.json({ configured: false, reason: 'AI notes are paused for today.' }),
  );
  expect(await checkAIReadiness()).toEqual({
    configured: false,
    reason: 'AI notes are paused for today.',
  });
});

it.each([null, {}, { configured: 'true' }])(
  'fails closed for an invalid readiness body',
  async (body) => {
    vi.stubGlobal('fetch', async () => Response.json(body));
    expect((await checkAIReadiness()).configured).toBe(false);
  },
);

it('does not reveal transport diagnostics', async () => {
  vi.stubGlobal('fetch', async () => {
    throw new Error('private diagnostic with credential');
  });
  const result = await checkAIReadiness();
  expect(result.configured).toBe(false);
  expect(result.reason).not.toContain('credential');
});
