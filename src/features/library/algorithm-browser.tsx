'use client';
import { useRef, useState } from 'react';
import { ArrowUpRight, BookOpen, Search, X } from 'lucide-react';
import { algorithmTopics, algorithms, catalogReferences, searchAlgorithms, type Algorithm } from "@/lib/algorithm-catalog";
import { examples } from "@/lib/examples";
import type { Language } from "@/shared/breakdown";
import { AlgorithmDetail } from "./algorithm-detail";
export function AlgorithmBrowser({
  busy,
  error,
  onLoad,
  onNewCode,
}: {
  busy: boolean;
  error: string;
  onLoad: (
    algorithm: Algorithm,
    language: Language,
    variant: 'featured' | 'reference',
  ) => Promise<boolean>;
  onNewCode: (name?: string) => void;
}) {
  const [topicId, setTopicId] = useState(algorithmTopics[0].id),
    [subtopicId, setSubtopicId] = useState(algorithmTopics[0].subtopics[0].id),
    [algorithmId, setAlgorithmId] = useState(''),
    [query, setQuery] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const topic = algorithmTopics.find((t) => t.id === topicId)!;
  const subtopic = topic.subtopics.find((s) => s.id === subtopicId) ?? topic.subtopics[0];
  const selected = algorithms.find((a) => a.id === algorithmId);
  const entries = query.trim() ? searchAlgorithms(query) : subtopic.algorithms;
  const chooseTopic = (id: string) => {
    const next = algorithmTopics.find((t) => t.id === id)!;
    setTopicId(id);
    setSubtopicId(next.subtopics[0].id);
    setAlgorithmId('');
    setQuery('');
  };
  const chooseSubtopic = (id: string) => {
    setSubtopicId(id);
    setAlgorithmId('');
    setQuery('');
  };
  const chooseAlgorithm = (algorithm: Algorithm) => {
    setTopicId(algorithm.topicId);
    setSubtopicId(algorithm.subtopicId);
    setAlgorithmId(algorithm.id);
  };
  const load = async (
    algorithm: Algorithm,
    language: Language,
    variant: 'featured' | 'reference',
  ) => {
    if (await onLoad(algorithm, language, variant)) dialog.current?.close();
  };

  return (
    <>
      <nav className="algorithm-navigation" aria-label="Algorithm navigation">
        <span className="mono algorithm-nav-label">
          <BookOpen size={14} /> / ALGORITHMS <span className="dim">({algorithms.length})</span>
        </span>
        <label>
          <span className="mono dim">01 / MAIN TOPIC</span>
          <select
            aria-label="Main topic"
            value={topicId}
            disabled={busy}
            onChange={(e) => chooseTopic(e.target.value)}
          >
            {algorithmTopics.map((t) => (
              <option value={t.id} key={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <span className="algorithm-chevron" aria-hidden="true">
          →
        </span>
        <label>
          <span className="mono dim">02 / SUBTOPIC</span>
          <select
            aria-label="Subtopic"
            value={subtopic.id}
            disabled={busy}
            onChange={(e) => chooseSubtopic(e.target.value)}
          >
            {topic.subtopics.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <span className="algorithm-chevron" aria-hidden="true">
          →
        </span>
        <label>
          <span className="mono dim">03 / ALGORITHM</span>
          <select
            aria-label="Algorithm"
            value={selected?.id ?? ''}
            disabled={busy}
            onChange={(e) => setAlgorithmId(e.target.value)}
          >
            <option value="">Choose an algorithm</option>
            {subtopic.algorithms.map((a) => (
              <option value={a.id} key={a.id}>
                {a.name}
                {a.exampleId ? ' · example' : ''}
              </option>
            ))}
          </select>
        </label>
        <button
          className="text-button mono"
          disabled={busy}
          aria-haspopup="dialog"
          onClick={() => {
            setQuery('');
            dialog.current?.showModal();
          }}
        >
          / browse all <ArrowUpRight size={14} />
        </button>
      </nav>
      {selected && (
        <aside className="algorithm-preview" aria-label="Selected algorithm">
          <AlgorithmDetail
            headingLevel={2}
            algorithm={selected}
            busy={busy}
            onLoad={load}
            onNewCode={(name) => {
              onNewCode(name);
              dialog.current?.close();
            }}
          />
          <button
            className="icon-button"
            aria-label="Dismiss algorithm details"
            onClick={() => setAlgorithmId('')}
          >
            <X size={15} />
          </button>
        </aside>
      )}
      <dialog ref={dialog} className="algorithm-dialog" aria-labelledby="algorithm-library-title">
        <div className="dialog-top">
          <span className="mono">/ ALGORITHM LIBRARY</span>
          <button
            className="icon-button"
            aria-label="Close algorithm library"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <h2 id="algorithm-library-title">
          FIND YOUR
          <br />
          NEXT MOVE<span>.</span>
        </h2>
        <p>
          {algorithmTopics.length} topics.{' '}
          {algorithmTopics.reduce((n, t) => n + t.subtopics.length, 0)} subtopics.{' '}
          {algorithms.length} runnable Python references. {examples.length} featured Python examples.
        </p>
        {error && (
          <p className="library-message mono" role="alert" data-testid="library-error">
            {error}
          </p>
        )}
        <label className="catalog-search">
          <Search size={18} />
          <span className="sr-only">Search algorithms</span>
          <input
            type="search"
            placeholder="Search names, topics, or techniques…"
            value={query}
            disabled={busy}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search algorithms"
          />
        </label>
        <div className="catalog-layout">
          <nav className="catalog-topics" aria-label="Library topics">
            {algorithmTopics.map((t) => (
              <button
                key={t.id}
                disabled={busy}
                aria-pressed={t.id === topicId}
                onClick={() => chooseTopic(t.id)}
              >
                {t.name}
                <span className="mono dim">
                  {t.subtopics.reduce((n, s) => n + s.algorithms.length, 0)}
                </span>
              </button>
            ))}
          </nav>
          <div className="catalog-content">
            {!query.trim() && (
              <>
                <nav className="catalog-subtopics" aria-label="Library subtopics">
                  {topic.subtopics.map((s) => (
                    <button
                      className="mono"
                      key={s.id}
                      disabled={busy}
                      aria-pressed={s.id === subtopic.id}
                      onClick={() => chooseSubtopic(s.id)}
                    >
                      {s.name}
                    </button>
                  ))}
                </nav>
                <p className="catalog-subtopic-description">{subtopic.description}</p>
              </>
            )}
            <p className="mono dim" role="status">
              {entries.length} {query.trim() ? 'search matches' : 'algorithms'}
            </p>
            <div className="catalog-results">
              {entries.map((a) => (
                <button
                  className="catalog-result"
                  key={a.id}
                  disabled={busy}
                  aria-pressed={a.id === selected?.id}
                  onClick={() => chooseAlgorithm(a)}
                >
                  <span>
                    <strong>{a.name}</strong>
                    <span className="mono dim">
                      {query.trim()
                        ? `${algorithmTopics.find((t) => t.id === a.topicId)?.name} / `
                        : ''}
                      {a.exampleId ? `EX.${a.exampleId} · FEATURED` : 'PYTHON · RUNNABLE'}
                    </span>
                    <p>{a.description}</p>
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              ))}
            </div>
            {!entries.length && (
              <p>No algorithms match this search. Try a broader name or topic.</p>
            )}
            {selected && (
              <AlgorithmDetail
                algorithm={selected}
                busy={busy}
                onLoad={load}
                onNewCode={(name) => {
                  onNewCode(name);
                  dialog.current?.close();
                }}
              />
            )}
          </div>
        </div>
        <footer className="catalog-footer mono">
          CURATED DSA CATALOG /{' '}
          <span>
            Further reading:{' '}
            {catalogReferences.map((ref, i) => (
              <span key={ref.url}>
                {i ? ' · ' : ''}
                <a href={ref.url} target="_blank" rel="noreferrer">
                  {ref.name} ↗
                </a>
              </span>
            ))}
          </span>
        </footer>
      </dialog>
    </>
  );
}
