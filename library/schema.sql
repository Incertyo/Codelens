PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  description TEXT NOT NULL
);
INSERT OR IGNORE INTO schema_migrations VALUES (1, 'Versioned DSA catalog, implementations and fixtures');

CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS subtopics (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES topics(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  position INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS algorithms (
  id TEXT PRIMARY KEY,
  subtopic_id TEXT NOT NULL REFERENCES subtopics(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  featured_example_id TEXT,
  position INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS implementations (
  id TEXT PRIMARY KEY,
  algorithm_id TEXT NOT NULL REFERENCES algorithms(id),
  language TEXT NOT NULL CHECK (language IN ('python', 'javascript')),
  variant TEXT NOT NULL CHECK (variant IN ('reference', 'featured')),
  revision INTEGER NOT NULL CHECK (revision > 0),
  code TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  revision_hash TEXT NOT NULL,
  source_file TEXT NOT NULL,
  entry_point TEXT NOT NULL,
  notes_json TEXT NOT NULL,
  UNIQUE (algorithm_id, language, variant, revision)
);
CREATE INDEX IF NOT EXISTS implementations_lookup ON implementations(algorithm_id, language, variant, revision DESC);
CREATE TABLE IF NOT EXISTS fixtures (
  id TEXT PRIMARY KEY,
  implementation_id TEXT NOT NULL REFERENCES implementations(id),
  name TEXT NOT NULL,
  stdin TEXT NOT NULL DEFAULT '',
  expected_stdout TEXT NOT NULL,
  match_mode TEXT NOT NULL CHECK (match_mode IN ('exact', 'contains'))
);

INSERT OR IGNORE INTO schema_migrations VALUES (2, 'Cached analysis, complexity and visual mapping responses');
CREATE TABLE IF NOT EXISTS analysis_results (
  id TEXT PRIMARY KEY,
  implementation_id TEXT,
  source_hash TEXT NOT NULL,
  language TEXT NOT NULL,
  data_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS analysis_results_lookup ON analysis_results(source_hash, language);
CREATE INDEX IF NOT EXISTS analysis_results_impl ON analysis_results(implementation_id);
