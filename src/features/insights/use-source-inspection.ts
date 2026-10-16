'use client';
import { useEffect, useRef, useState } from 'react';
import { CodeRunner } from "@/features/runner/public/code-runner";
import { sourceIdentity, type InputKind, type Inspection, type SourceIdentity } from "@/features/insights/model/analysis";
import type { Language } from "@/shared/breakdown";

type InspectionOptions = {
  delay: number;
  failure: string;
  cache: (analysis: { bigOFit?: import('@/lib/measurement').MeasurementFit }) => void;
  cancel?: () => void;
  cleanup: () => void;
};

export function useSourceInspection(code: string, language: Language, implementationId: string, options: InspectionOptions) {
  const [data, setData] = useState<{ identity: SourceIdentity; inspection: Inspection } | null>(null);
  const [error, setError] = useState('');
  const [entryName, setEntryName] = useState('');
  const [kind, setKind] = useState<InputKind>('list');
  const worker = useRef<CodeRunner | null>(null);
  const active = useRef(true);
  const handlers = useRef(options);
  useEffect(() => { handlers.current = options; });
  useEffect(() => {
    active.current = true;
    let current = true;
    const timer = setTimeout(() => {
      worker.current = new CodeRunner();
      Promise.all([sourceIdentity(implementationId, code), worker.current.inspect(code, language)])
        .then(([identity, inspection]) => {
          if (!current) return;
          setData({ identity, inspection });
          const first = inspection.entries.find((e) => !e.reason) || inspection.entries[0];
          if (first) {
            setEntryName(first.name);
            setKind(first.kinds[0] || 'list');
          }
          fetch(`/api/analyze?sourceHash=${identity.sourceHash}&language=${language}&implementationId=${encodeURIComponent(implementationId)}`)
            .then((r) => r.ok ? r.json() : null)
            .then((res) => {
              if (current && res?.analysis) handlers.current.cache(res.analysis);
            })
            .catch(() => {});
        })
        .catch((e) => {
          if (current) setError(e instanceof Error ? e.message : handlers.current.failure);
        });
    }, handlers.current.delay);
    return () => {
      current = false;
      clearTimeout(timer);
      active.current = false;
      handlers.current.cancel?.();
      worker.current?.dispose();
      handlers.current.cleanup();
    };
  }, [code, language, implementationId]);
  return { data, error, entryName, setEntryName, kind, setKind, worker, active };
}
