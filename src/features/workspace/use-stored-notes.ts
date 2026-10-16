'use client';
import { useEffect } from 'react';
import { useStore } from "@/features/workspace/store";
import { enrichmentSchema, type Language } from "@/shared/breakdown";
import type { UnsupportedEditorLanguage } from "@/features/editor/public/policy";

export function useStoredNotes(code: string, language: Language, unsupportedLanguage: UnsupportedEditorLanguage | null, sourceIssue: string | null, implementationId: string) {
  useEffect(() => {
    if (unsupportedLanguage || sourceIssue || !code.trim()) return;
    let active = true;
    const encoder = new TextEncoder();
    crypto.subtle
      .digest('SHA-256', encoder.encode(code))
      .then((hashBuf) => {
        if (!active) return;
        const sHash = Array.from(new Uint8Array(hashBuf))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
        fetch(
          `/api/analyze?sourceHash=${sHash}&language=${language}&implementationId=${encodeURIComponent(implementationId)}`,
        )
          .then((r) => (r.ok ? r.json() : null))
          .then((res) => {
            if (
              active &&
              res?.analysis?.enrichment &&
              useStore.getState().code === code &&
              useStore.getState().language === language &&
              !useStore.getState().enrichment
            ) {
              const parsed = enrichmentSchema.safeParse(res.analysis.enrichment);
              if (parsed.success) {
                useStore.getState().setEnrichment(parsed.data);
              }
            }
          })
          .catch(() => {});
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [code, language, unsupportedLanguage, sourceIssue, implementationId]);

}
