import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const args = process.argv.slice(2);
const environment = args.find((arg) => arg.startsWith('--env='))?.slice(6);
const file = args.find((arg) => arg.startsWith('--file='))?.slice(7);
let failed = false;
function check(name, valid) {
  console.log(`${valid ? 'PASS' : 'FAIL'} ${name}`);
  failed ||= !valid;
}
function endpoint(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}
function singleLine(value, max = 4096) {
  return (
    typeof value === 'string' &&
    Boolean(value.trim()) &&
    value === value.trim() &&
    value.length <= max &&
    !/[\r\n\0]/.test(value)
  );
}

try {
  if (
    !['production', 'preview'].includes(environment) ||
    args.some((arg) => !arg.startsWith('--env=') && !arg.startsWith('--file=')) ||
    args.filter((arg) => arg.startsWith('--env=')).length !== 1 ||
    args.filter((arg) => arg.startsWith('--file=')).length > 1 ||
    (file !== undefined && !file)
  ) {
    console.log(
      'FAIL usage: npm run check:env -- --env=production|preview [--file=.env.production.audit]',
    );
    process.exitCode = 1;
  } else {
    const template = parseEnv(readFileSync(new URL('../.env.example', import.meta.url), 'utf8'));
    const values = file ? parseEnv(readFileSync(file, 'utf8')) : process.env;
    for (const name of [
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
      'CODELENS_RATE_NAMESPACE',
      'CODELENS_STATIC_LIBRARY',
      'AI_ENABLED',
      'AI_DAILY_LIMIT',
      'LLM_PROVIDER',
      'LLM_MODEL',
      'LLM_API_KEY',
      'LLM_BASE_URL',
    ]) {
      if (!Object.hasOwn(template, name)) throw new Error();
    }
    check('VERCEL_ENV', !values.VERCEL_ENV || values.VERCEL_ENV === environment);
    check('UPSTASH_REDIS_REST_URL', endpoint(values.UPSTASH_REDIS_REST_URL));
    check('UPSTASH_REDIS_REST_TOKEN', singleLine(values.UPSTASH_REDIS_REST_TOKEN));
    check(
      'CODELENS_RATE_NAMESPACE',
      /^[a-zA-Z0-9_-]{1,80}$/.test(values.CODELENS_RATE_NAMESPACE || ''),
    );
    check('CODELENS_STATIC_LIBRARY', values.CODELENS_STATIC_LIBRARY === '1');
    check(
      'AI_ENABLED',
      environment === 'preview'
        ? values.AI_ENABLED === 'false'
        : ['false', 'true'].includes(values.AI_ENABLED),
    );
    const daily = values.AI_DAILY_LIMIT ?? template.AI_DAILY_LIMIT;
    check(
      'AI_DAILY_LIMIT',
      /^\d+$/.test(daily) && Number.isSafeInteger(Number(daily)) && Number(daily) > 0,
    );
    if (environment === 'production') {
      check('AI_DAILY_LIMIT', singleLine(values.AI_DAILY_LIMIT));
      check(
        'LLM_PROVIDER',
        ['openai', 'openai-compatible', 'anthropic', 'google'].includes(values.LLM_PROVIDER),
      );
      check('LLM_MODEL', singleLine(values.LLM_MODEL, 200));
      check('LLM_API_KEY', singleLine(values.LLM_API_KEY));
    } else {
      check('LLM_API_KEY', !values.LLM_API_KEY);
      if (values.LLM_PROVIDER)
        check(
          'LLM_PROVIDER',
          ['openai', 'openai-compatible', 'anthropic', 'google'].includes(values.LLM_PROVIDER),
        );
      if (values.LLM_MODEL) check('LLM_MODEL', singleLine(values.LLM_MODEL, 200));
    }
    if (values.LLM_BASE_URL) check('LLM_BASE_URL', endpoint(values.LLM_BASE_URL));
    console.log(`${failed ? 'FAIL' : 'PASS'} environment validation`);
    process.exitCode = failed ? 1 : 0;
  }
} catch {
  console.log('FAIL environment input or template could not be validated');
  process.exitCode = 1;
}
