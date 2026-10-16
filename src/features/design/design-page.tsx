'use client';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Play } from 'lucide-react';
import { Preferences, usePreferences } from "@/features/preferences/public/preferences";
import { useEffect, useState } from 'react';
import { useStore } from "@/features/workspace/public/store";
function TokenCatalog() {
  const theme = useStore((s) => s.theme);
  const [tokens, setTokens] = useState<[string, string][]>([]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const styles = getComputedStyle(document.documentElement);
      const owned =
        /^--(paper|ink|accent|bg|surface(-raised)?|fg|muted|border|soft|font-(ui|code|dot)|s\d+|text-(xs|sm|code|base|lg|editor)|hairline|radius|step-duration|page-gutter|code-.+|transparent)$/;
      setTokens(
        Array.from(styles)
          .filter((name) => owned.test(name))
          .sort()
          .map((name) => [name, styles.getPropertyValue(name).trim()]),
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [theme]);
  return (
    <details className="token-catalog">
      <summary className="mono">/ all tokens ({tokens.length})</summary>
      <table>
        <thead>
          <tr>
            <th>Token</th>
            <th>Current value</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map(([name, value]) => (
            <tr key={name}>
              <td>
                <code>{name}</code>
              </td>
              <td>
                <code>{value}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
export default function Design() {
  usePreferences();
  return (
    <main className="design-page">
      <header className="topbar">
        <Link className="wordmark" href="/">
          <span className="slash-logo">/</span> codelens.
        </Link>
        <Preferences />
      </header>
      <Link className="text-button mono design-back" href="/">
        <ArrowLeft size={14} /> back to workspace
      </Link>
      <p className="mono dim">THE SYSTEM / V.01</p>
      <h1>
        DESIGNED
        <br />
        TO BE CLEAR.
      </h1>
      <p className="design-intro">One accent. Three typefaces. A little room to think.</p>
      <section>
        <h2>
          <span className="mono">01</span> COLOR / TOKENS
        </h2>
        <div className="swatches">
          {[
            ['--bg', 'BACKGROUND'],
            ['--surface', 'SURFACE'],
            ['--fg', 'INK / TEXT'],
            ['--muted', 'MUTED'],
            ['--border', 'HAIRLINE'],
            ['--accent', 'SIGNAL'],
          ].map(([token, label]) => (
            <div key={token}>
              <div className="swatch" style={{ background: `var(${token})` }} />
              <strong className="mono">{label}</strong>
              <code>{token}</code>
            </div>
          ))}
        </div>
        <p className="mono dim">
          DARK BY DEFAULT / WARM OFF-WHITE #F4F4F2 / INK #0E0E0E / SIGNAL #FFD60A
        </p>
        <TokenCatalog />
      </section>
      <section>
        <h2>
          <span className="mono">02</span> TYPE / VOICE
        </h2>
        <div className="type-specimen">
          <span className="mono dim">DISPLAY + UI / SPACE GROTESK</span>
          <p className="display-specimen">A CLOSER LOOK.</p>
          <span className="mono dim">CODE + DATA / JETBRAINS MONO</span>
          <p className="mono">
            numbers = [5, 3, 8, 1, 2]
            <br />
            for i in range(len(numbers)):
          </p>
          <span className="mono dim">COUNTERS / DOTO</span>
          <p className="doto counter-specimen">( 014 / 120 )</p>
        </div>
      </section>
      <section>
        <h2>
          <span className="mono">03</span> ACTIONS / STATES
        </h2>
        <div className="design-actions">
          <button className="run-button">
            <Play size={13} /> / run code <ArrowUpRight size={16} />
          </button>
          <button className="text-button mono">
            / examples <ArrowUpRight size={13} />
          </button>
          <button className="run-button" disabled>
            / unavailable
          </button>
          <button className="text-button mono focus-demo">/ keyboard focus</button>
        </div>
        <div className="design-tabs">
          <span className="active-tab">01 Visualizer</span>
          <span>02 Breakdown</span>
          <span>03 Analysis</span>
        </div>
        <p className="notice">
          Trace truncated at the safety limit. The captured steps remain available.
        </p>
        <div className="design-cells">
          <span className="array-cell mono">5</span>
          <span className="array-cell mono changed">
            3 <small>↗ changed</small>
          </span>
          <span className="array-cell mono pointed">
            8 <small>↑ mid</small>
          </span>
        </div>
        <p className="step-explanation">
          <span className="step-dot" />i = 2. Next: line 4.
        </p>
        <div className="design-states">
          <p className="mono">
            / loading Python… <progress aria-label="Sample loading state" max={100} value={62} />
          </p>
          <p className="empty-note mono">No variables yet.</p>
          <p className="notice">ZeroDivisionError: division by zero. → Line 2</p>
        </div>
      </section>
      <section>
        <h2>
          <span className="mono">04</span> SPACE / MOTION
        </h2>
        <div className="space-scale">
          {[1, 2, 3, 4, 6, 8, 12, 16].map((n) => (
            <div key={n}>
              <div style={{ width: `${n * 4}px` }} />
              <span className="mono">{n * 4}px</span>
            </div>
          ))}
        </div>
        <p>
          Hairlines: 1px. Corners: 0–2px. Step motion: 200ms. Decorative motion honors the Reduce
          motion control and your system preference.
        </p>
      </section>
      <footer className="site-footer mono">
        CODELENS / DESIGN SYSTEM{' '}
        <Link href="/">
          / return <ArrowUpRight size={13} />
        </Link>
      </footer>
    </main>
  );
}
