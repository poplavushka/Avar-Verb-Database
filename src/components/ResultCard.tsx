import { Link } from "react-router-dom";

import { normalizeForSearch } from "../lib/search";
import type { Entry } from "../lib/types";
import { BookmarkButton } from "./BookmarkButton";

type ResultCardProps = {
  entry: Entry;
  bookmarked: boolean;
  translit: boolean;
  onToggleBookmark: () => void;
};

function collectTags(entry: Entry): string[] {
  const tags = [
    entry.grammar.verbClass ? `class ${entry.grammar.verbClass}` : "",
    entry.derivation.verbFormation,
    ...entry.summary.transitivityValues,
    entry.derivation.flags.causative ? "causative" : "",
    entry.derivation.flags.fullReduplication ? "full reduplication" : "",
    entry.derivation.flags.dReduplication ? "d-reduplication" : "",
    entry.derivation.flags.durativeAr ? "durative -ar" : "",
    entry.derivation.flags.ablautIToE ? "ablaut i > e" : "",
  ];

  return [...new Set(tags.filter(Boolean))].slice(0, 8);
}

function formatVerbForm(value: string, translit: boolean) {
  return translit ? normalizeForSearch(value, true) : value;
}

export function ResultCard({ entry, bookmarked, translit, onToggleBookmark }: ResultCardProps) {
  const firstDefinition = entry.definitions[0];
  const contextCount = entry.definitions.reduce(
    (sum, definition) => sum + definition.contexts.length,
    0,
  );

  return (
    <article className="result-card">
      <div className="result-card-header">
        <div>
          <p className="card-stem">{formatVerbForm(entry.lemma.stem, translit)}</p>
          <p className="card-infinitive">{formatVerbForm(entry.lemma.infinitive, translit)}</p>
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
