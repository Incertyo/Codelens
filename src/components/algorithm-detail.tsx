'use client';
import { ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import type { Language } from '@/lib/breakdown';
import { algorithmTopics, type Algorithm } from '@/lib/algorithm-catalog';
export function AlgorithmDetail({
  algorithm,
  busy,
  onLoad,
  onNewCode,
  headingLevel = 3,
}: {
  algorithm: Algorithm;
  busy: boolean;
  onLoad: (algorithm: Algorithm, language: Language, variant: 'featured' | 'reference') => void;
  onNewCode: (name: string) => void;
  headingLevel?: 2 | 3;
}) {
  const [preferredLanguage, setPreferredLanguage] = useState<Language>('python');
  const language = algorithm.exampleId ? preferredLanguage : 'python';
  const topic = algorithmTopics.find((t) => t.id === algorithm.topicId),
    subtopic = topic?.subtopics.find((s) => s.id === algorithm.subtopicId);
  return (
    <div className="algorithm-detail" data-testid="algorithm-detail">
      <span className="mono dim">
        {topic?.name} / {subtopic?.name}
      </span>
      {headingLevel === 2 ? <h2>{algorithm.name}</h2> : <h3>{algorithm.name}</h3>}
      <p>{algorithm.description}</p>
      <label className="mono library-language">
        Implementation language
        <select
          aria-label="Implementation language"
          value={language}
          disabled={busy}
          onChange={(e) => setPreferredLanguage(e.target.value as Language)}
        >
          <option value="python">Python · available</option>
          <option value="javascript" disabled={!algorithm.exampleId}>
            {algorithm.exampleId ? 'JavaScript · featured example' : 'JavaScript · not yet added'}
          </option>
        </select>
      </label>
      <div className="algorithm-detail-actions">
        {algorithm.exampleId ? (
          <button
            className="signal-button mono"
            disabled={busy}
            onClick={() => onLoad(algorithm, language, 'featured')}
          >
            / load example EX.{algorithm.exampleId} <ArrowUpRight size={14} />
          </button>
        ) : null}
        <button
          className="signal-button mono"
          disabled={busy || language !== 'python'}
          onClick={() => onLoad(algorithm, 'python', 'reference')}
        >
          / load reference code <ArrowUpRight size={14} />
        </button>
        <button
          className="text-button mono"
          disabled={busy}
          onClick={() => onNewCode(algorithm.name)}
        >
          / new implementation <ArrowUpRight size={14} />
        </button>
      </div>
    </div>
  );
}
