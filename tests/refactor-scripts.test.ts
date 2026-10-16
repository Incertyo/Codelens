import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { libraryManifest } from '../scripts/library-manifest.mjs';

describe('revamp script characterization', () => {
  it('keeps every frozen manifest input and the catalog byte-identical', async () => {
    const frozen = JSON.parse(readFileSync('tests/fixtures/revamp/frozen.json', 'utf8'));
    expect(await libraryManifest()).toEqual(frozen.manifest);
    expect(
      createHash('sha256').update(readFileSync('src/generated/library.json')).digest('hex'),
    ).toBe(frozen.exportHash);
  });

  it('local visual capture refuses CI and non-loopback targets without launching a browser', () => {
    const ci = spawnSync(process.execPath, ['scripts/refactor-visual-parity.mjs'], {
      env: { ...process.env, CI: '1' },
      encoding: 'utf8',
    });
    expect(ci.status).toBe(1);
    expect(ci.stderr).toContain('must not run in CI');
    const remote = spawnSync(
      process.execPath,
      ['scripts/refactor-visual-parity.mjs', '--url=https://fixture.invalid'],
      { env: { ...process.env, CI: '' }, encoding: 'utf8' },
    );
    expect(remote.status).toBe(1);
    expect(remote.stderr).toContain('Only a loopback HTTP origin is allowed');
  });

  it.each([
    ['preview', 'false', '', 0],
    ['preview', 'true', '', 1],
    ['preview', 'false', 'fixture-key', 1],
    ['production', 'true', 'fixture-key', 0],
  ])('check:env %s AI=%s respects its credential policy', (environment, enabled, key, expected) => {
    const directory = mkdtempSync(join(tmpdir(), 'codelens-env-parity-'));
    const file = join(directory, 'fixture.env');
    writeFileSync(
      file,
      [
        `VERCEL_ENV=${environment}`,
        'UPSTASH_REDIS_REST_URL=https://fixture.invalid',
        'UPSTASH_REDIS_REST_TOKEN=fixture-token',
        'CODELENS_RATE_NAMESPACE=fixture',
        'CODELENS_STATIC_LIBRARY=1',
        `AI_ENABLED=${enabled}`,
        'AI_DAILY_LIMIT=5',
        'LLM_PROVIDER=openai-compatible',
        'LLM_MODEL=fixture-model',
        `LLM_API_KEY=${key}`,
      ].join('\n'),
    );
    try {
      const result = spawnSync(
        process.execPath,
        ['scripts/check-env.mjs', `--env=${environment}`, `--file=${file}`],
        { encoding: 'utf8' },
      );
      expect(result.status).toBe(expected);
      expect(result.stdout).not.toContain('fixture-key');
      expect(result.stdout).not.toContain('fixture-token');
      expect(result.stderr).toBe('');
    } finally {
      unlinkSync(file);
      rmdirSync(directory);
    }
  });

  it('catalog verification remains a read-only command', () => {
    const result = spawnSync(process.execPath, ['scripts/verify-library.mjs'], {
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Verified static catalog source manifest');
    expect(result.stderr).toBe('');
  });
});
