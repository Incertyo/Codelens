import { createServer } from 'node:http';
import { LIMIT_SCRIPT } from "../src/features/ai/public/server/rate-limit";

export async function sharedStoreFixture() {
  let now = 0;
  const counters = new Map<string, { count: number; reset: number }>();
  let unavailable = false;
  let writable = true;
  const commands: unknown[][] = [];
  const server = createServer((req, res) => {
    let text = '';
    req.on('data', (chunk) => (text += chunk));
    req.on('end', () => {
      const command = JSON.parse(text);
      commands.push(command);
      if (unavailable || (!writable && command[7] !== 'check')) {
        res.statusCode = 503;
        res.end('{}');
        return;
      }
      if (
        req.headers.authorization !== 'Bearer redis-fixture-token' ||
        command[0] !== 'EVAL' ||
        command[1] !== LIMIT_SCRIPT ||
        command[2] !== '4'
      ) {
        res.statusCode = 400;
        res.end('{}');
        return;
      }
      const bucket = (key: string, ttl = 60000) => {
        const old = counters.get(key);
        if (old && old.reset > now) return old;
        return { count: 0, reset: now + ttl };
      };
      const c = bucket(command[3]),
        g = bucket(command[4]),
        d = bucket(command[5], Number(command[11])),
        mode = command[7],
        dailyExceeded = d.count >= Number(command[10]),
        allowed =
          !dailyExceeded &&
          g.count < Number(command[9]) &&
          (mode === 'call' || c.count < Number(command[8]));
      if (allowed && mode === 'client') {
        c.count++;
        counters.set(command[3], c);
      } else if (allowed && mode === 'call') {
        g.count++;
        d.count++;
        counters.set(command[4], g);
        counters.set(command[5], d);
      }
      res.setHeader('content-type', 'application/json');
      res.end(
        JSON.stringify({
          result: dailyExceeded
            ? [2, Number(command[11])]
            : allowed
              ? [1, 0]
              : [0, Math.max(c.reset, g.reset) - now],
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Fixture address missing');
  return {
    url: `http://127.0.0.1:${address.port}`,
    advance: (ms: number) => (now += ms),
    unavailable: (value = true) => (unavailable = value),
    writable: (value: boolean) => (writable = value),
    commands,
    counters: () => new Map(counters),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
