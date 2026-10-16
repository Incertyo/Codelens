export function selectQuickGoldens(snapshot, goldens) {
  const topics = new Set(snapshot.index.topics.map((row) => row.id));
  const cases = goldens.cases;
  const examples = snapshot.index.implementations
    .filter((row) => row.variant === 'featured')
    .map((row) => row.id)
    .sort();
  const candidates = snapshot.index.implementations
    .filter((row) => row.language === 'python' && row.variant === 'reference')
    .sort((a, b) => a.id.localeCompare(b.id));
  const kinds = (id) =>
    new Set(cases[id].models.flatMap((sample) => sample.models.map((model) => model.kind)));
  const allKinds = new Set(Object.keys(cases).flatMap((id) => [...kinds(id)]));
  const coveredKinds = new Set(examples.flatMap((id) => [...kinds(id)]));
  const coveredTopics = new Set();
  const selected = [];
  while (coveredTopics.size < topics.size || coveredKinds.size < allKinds.size) {
    const ranked = candidates
      .filter((row) => !selected.includes(row.id))
      .map((row) => ({
        row,
        score:
          Number(!coveredTopics.has(row.algorithm_id.split('/')[0])) * 100 +
          [...kinds(row.id)].filter((kind) => !coveredKinds.has(kind)).length,
      }))
      .sort((a, b) => b.score - a.score || a.row.id.localeCompare(b.row.id));
    if (!ranked[0]?.score || selected.length >= 25)
      throw new Error('Quick corpus cannot cover every topic/model within 25 implementations.');
    const row = ranked[0].row;
    selected.push(row.id);
    coveredTopics.add(row.algorithm_id.split('/')[0]);
    for (const kind of kinds(row.id)) coveredKinds.add(kind);
  }
  for (const row of candidates) {
    if (selected.length === 25) break;
    if (!selected.includes(row.id)) selected.push(row.id);
  }
  return {
    implementations: selected,
    examples,
    topics: [...coveredTopics].sort(),
    modelKinds: [...coveredKinds].sort(),
  };
}
