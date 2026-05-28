import { Link } from "react-router-dom";

import type { Entry } from "../lib/types";
import { BookmarkButton } from "./BookmarkButton";

type ResultCardProps = {
  entry: Entry;
  bookmarked: boolean;
  onToggleBookmark: () => void;
};

function collectTags(entry: Entry): string[] {
  const tags = [
    entry.grammar.verbClass ? `class ${entry.grammar.verbClass}` : "",
    entry.derivation.verbFormation,
    ...entry.summary.transitivityValues,
    ...entry.summary.labilityValues,
    entry.derivation.flags.causative ? "causative" : "",
    entry.derivation.flags.fullReduplication ? "full reduplication" : "",
    entry.derivation.flags.dReduplication ? "d-reduplication" : "",
    entry.derivation.flags.durativeAr ? "durative -ar" : "",
    entry.derivation.flags.ablautIToE ? "ablaut i > e" : "",
  ];

  return [...new Set(tags.filter(Boolean))].slice(0, 8);
}

export function ResultCard({ entry, bookmarked, onToggleBookmark }: ResultCardProps) {
  const firstDefinition = entry.definitions[0];
  const contextCount = entry.definitions.reduce(
    (sum, definition) => sum + definition.contexts.length,
    0,
  );

  return (
    <article className="result-card">
      <div className="result-card-header">
        <div>
          <p className="card-stem">{entry.lemma.stem}</p>
          <p className="card-infinitive">{entry.lemma.infinitive}</p>
        </div>
        <BookmarkButton active={bookmarked} onToggle={onToggleBookmark} />
      </div>

      <p className="card-definition">{firstDefinition?.definition || "No definition available."}</p>
      {firstDefinition?.meaningRu ? (
        <p className="card-translation">{firstDefinition.meaningRu}</p>
      ) : null}

      <div className="tag-row">
        {collectTags(entry).map((tag) => (
          <span key={tag} className="tag-chip">
            {tag}
          </span>
        ))}
      </div>

      <div className="card-meta">
        <span>{entry.definitions.length} definitions</span>
        <span>{contextCount} examples</span>
        <span>{entry.outgoingDerivatives.length} derivatives</span>
      </div>

      <Link to={`/verb/${entry.id}`} className="detail-link">
        Open entry
      </Link>
    </article>
  );
}
