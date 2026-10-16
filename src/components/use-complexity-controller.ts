'use client';
import { useSourceInspection } from './use-source-inspection';
import { limits } from '@/shared/limits';
import { useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { empiricalProfiles, generatedInput, type Sample } from '@/lib/analysis';

import { MeasurementRunner } from '@/lib/measurement-runner';
import { measurementSizes, type MeasurementFit, type MeasurementSeries } from '@/lib/measurement';

import { getEnrichedAlgorithm } from '@/lib/enriched-catalog';

export function useComplexityController(implementationId: string) {
  const code = useStore((s) => s.code),
    language = useStore((s) => s.language),
    enrichment = useStore((s) => s.enrichment);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [timeSamples, setTimeSamples] = useState<Sample[]>([]);
  const [spaceSamples, setSpaceSamples] = useState<Sample[]>([]);
  const [profile, setProfile] = useState<keyof typeof empiricalProfiles>('standard');
  const [timeFit, setTimeFit] = useState<MeasurementFit | null>(null);
  const [spaceFit, setSpaceFit] = useState<MeasurementFit | null>(null);
  const [measurementResult, setMeasurementResult] = useState<MeasurementSeries | null>(null);
  const [measuring, setMeasuring] = useState(false);

  const measurementWorker = useRef<MeasurementRunner | null>(null);

  const { data, error, entryName, setEntryName, kind, setKind, active } = useSourceInspection(code, language, implementationId, {
    delay: limits.complexityDebounceMs,
    failure: 'Analysis failed to initialize.',
    cache: (analysis) => { if (analysis.bigOFit) setTimeFit(analysis.bigOFit); },
    cleanup: () => { measurementWorker.current?.dispose(); },
  });
  const entry = data?.inspection.entries.find((e) => e.name === entryName);
  const enriched = implementationId.startsWith('draft:')
    ? null
    : getEnrichedAlgorithm(implementationId.split(':')[0]);
  const mainTimeComplexity =
    enrichment?.timeComplexity ||
    enriched?.timeComplexity ||
    entry?.time.replace(' candidate', '') ||
    'Unknown';
  const mainSpaceComplexity =
    enrichment?.spaceComplexity ||
    enriched?.spaceComplexity ||
    entry?.space.replace(' candidate', '') ||
    'Unknown';

  const measure = async () => {
    if (!data || !entry || busy) return;
    setBusy(true);
    setTimeSamples([]);
    setSpaceSamples([]);
    setTimeFit(null);
    setSpaceFit(null);
    setMeasurementResult(null);
    setMeasuring(true);
    setNotice('Preparing snapshot-free real measurements…');

    try {
      const collectedTime: Sample[] = [];
      const collectedSpace: Sample[] = [];
      measurementWorker.current = new MeasurementRunner();
      const result = await measurementWorker.current.measure(
        {
          code,
          entry: entry.name,
          language,
          sizes: profile === 'standard' ? measurementSizes : empiricalProfiles[profile],
          argumentsForSize: (n) => [generatedInput(kind, n)],
        },
        (progress) => {
          if (!active.current) return;
          if (progress.n !== null) {
            setNotice(
              `Measuring ${entry.name}: size ${progress.n} (${progress.index}/${progress.total})…`,
            );
          }
          if (progress.result?.status === 'complete') {
            if (progress.result.lineEvents! > 0) {
              collectedTime.push({ n: progress.result.n, steps: progress.result.lineEvents! });
              setTimeSamples([...collectedTime]);
            }
            if (progress.result.auxiliaryPeak !== null) {
              collectedSpace.push({ n: progress.result.n, steps: progress.result.auxiliaryPeak });
              setSpaceSamples([...collectedSpace]);
            }
          }
        },
      );

      if (!active.current) return;
      setMeasurementResult(result);
      setTimeFit(result.time);
      setSpaceFit(result.space);
      setNotice(
        result.time
          ? `Local estimate from ${result.time.validPoints} complete measured runs at sizes up to ${result.time.maxN}.${result.reduced ? ' Larger sizes were stopped at a resource or execution bound.' : ''}`
          : 'No estimate is fitted: fewer than four complete positive sizes. Budget-exceeded, partial and failed sizes are excluded.',
      );
    } catch (e) {
      if (active.current) {
        setNotice(e instanceof Error ? e.message : 'Measurement could not finish.');
      }
    } finally {
      if (active.current) {
        setBusy(false);
        setMeasuring(false);
      }
    }
  };

  return { code, enrichment, data, error, entryName, setEntryName, kind, setKind, busy, notice, timeSamples, setTimeSamples, spaceSamples, setSpaceSamples, profile, setProfile, timeFit, setTimeFit, spaceFit, setSpaceFit, measurementResult, setMeasurementResult, measuring, measurementWorker, entry, enriched, mainTimeComplexity, mainSpaceComplexity, measure };
}
