import type { ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";

import type { Dataset, Entry } from "../lib/types";
import { BookmarkButton } from "../components/BookmarkButton";

type VerbDetailPageProps = {
  dataset: Dataset;
  bookmarks: Set<string>;
  onToggleBookmark: (entryId: string) => void;
};

type DetailListItem = {
  label: string;
  value: ReactNode;
  plainText?: string;
};

function hasDetailValue(item: DetailListItem) {
  if (typeof item.value === "string") {
    return item.value.trim().length > 0;
  }

  return (item.plainText ?? "").trim().length > 0;
}

function DetailList({ items }: { items: DetailListItem[] }) {
  return (
    <dl className="detail-grid">
      {items
        .filter(hasDetailValue)
        .map(({ label, value }) => (
          <div key={label} className="detail-item">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );
}

function dedupeEntries(entries: Entry[]) {
  return [...new Map(entries.map((entry) => [entry.id, entry])).values()];
}

function DefinitionPanel({ entry }: { entry: Entry }) {
  return (
    <section className="section-card">
      <div className="section-heading">
        <h2>Definitions and valency frames</h2>
      </div>
      <div className="definition-list">
        {entry.definitions.map((definition) => (
          <article key={definition.id} className="definition-card">
            <div className="definition-title-row">
              <h3>
                {definition.idDefinition ? `Definition ${definition.idDefinition}` : "Definition"}
              </h3>
              <span className="definition-flags">
                {[definition.transitivity].filter(Boolean).join(" · ")}
              </span>
            </div>
            <p>{definition.definition}</p>
            {definition.meaningRu ? <p className="card-translation">{definition.meaningRu}</p> : null}
            {Object.keys(definition.frameSlots).length ? (
              <div className="frame-slots">
                {Object.entries(definition.frameSlots).map(([slot, value]) => (
                  <span key={slot} className="frame-chip">
                    {slot.toUpperCase()}: {value}
                  </span>
                ))}
              </div>
            ) : null}
            {definition.contexts.length ? (
              <div className="context-stack">
                {definition.contexts.map((context) => (
                  <blockquote key={`${definition.id}-${context.slot}`} className="context-card">
                    <p>{context.text || "No example text."}</p>
                    {context.translationRu ? <footer>{context.translationRu}</footer> : null}
                    {context.exampleSource ? (
                      <cite>{context.exampleSource}</cite>
                    ) : null}
                  </blockquote>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export function VerbDetailPage({
  dataset,
  bookmarks,
  onToggleBookmark,
}: VerbDetailPageProps) {
  const { id } = useParams();
  const entry = dataset.entries.find((candidate) => candidate.id === id);

  if (!id) {
    return <Navigate to="/dictionary" replace />;
  }

  if (!entry) {
    return (
      <div className="page">
        <section className="section-card">
          <h1>Entry not found</h1>
          <p>The requested verb ID is not present in the current dataset.</p>
          <Link to="/dictionary" className="detail-link">
            Back to dictionary
          </Link>
        </section>
      </div>
    );
  }

  const formationStemCandidates = dedupeEntries([
    ...entry.derivedFrom
      .map((item) => dataset.entries.find((candidate) => candidate.id === item.entryId))
      .filter((candidate): candidate is Entry => Boolean(candidate)),
    ...dataset.entries.filter(
      (candidate) =>
        candidate.id !== entry.id &&
        (candidate.lemma.stem === entry.derivation.verbFormationStem ||
          candidate.grammar.stems.stem0 === entry.derivation.verbFormationStem),
    ),
  ]);

  const formationStemValue = formationStemCandidates.length ? (
    <div className="detail-link-stack">
      <span>{entry.derivation.verbFormationStem}</span>
      <div className="link-list">
        {formationStemCandidates.map((candidate) => (
          <Link key={candidate.id} to={`/verb/${candidate.id}`} className="link-chip">
            {candidate.lemma.stem} {candidate.lemma.infinitive}
          </Link>
        ))}
      </div>
    </div>
  ) : (
    entry.derivation.verbFormationStem
  );

  return (
    <div className="page">
      <section className="section-card">
        <div className="section-heading detail-hero">
          <div>
            <Link to="/dictionary" className="back-link">
              Back to dictionary
            </Link>
            <h1>{entry.lemma.stem}</h1>
            <p className="card-infinitive">{entry.lemma.infinitive}</p>
          </div>
          <BookmarkButton
            active={bookmarks.has(entry.id)}
            onToggle={() => onToggleBookmark(entry.id)}
          />
        </div>
        <p className="source-line">{entry.lemma.source}</p>
      </section>

      <section className="section-card">
        <div className="section-heading">
          <h2>Grammatical information</h2>
        </div>
        <DetailList
          items={[
            { label: "Theme vowel", value: entry.grammar.themeVowel },
            { label: "Inflectional class", value: entry.grammar.verbClass },
            { label: "Stem0", value: entry.grammar.stems.stem0 },
            { label: "Stem1", value: entry.grammar.stems.stem1 },
            { label: "Stem2", value: entry.grammar.stems.stem2 },
            { label: "Stem type", value: entry.grammar.stems.stemType },
            { label: "Stem notes", value: entry.grammar.stems.stemNotes },
            { label: "Accent paradigm", value: entry.grammar.accentParadigm },
            { label: "Phonological structure", value: entry.grammar.phonology.structure },
            {
              label: "Phonological structure (unaccented)",
              value: entry.grammar.phonology.structureUnaccented,
            },
            { label: "Agreement slots", value: entry.grammar.agreementSlot },
          ]}
        />

        <div className="principal-parts">
          <h3>Principal parts</h3>
          <table>
            <tbody>
              <tr>
                <th>Presence</th>
                <td>{entry.grammar.principalParts.presence || "—"}</td>
              </tr>
              <tr>
                <th>Future</th>
                <td>{entry.grammar.principalParts.future || "—"}</td>
              </tr>
              <tr>
                <th>Aorist</th>
                <td>{entry.grammar.principalParts.aorist || "—"}</td>
              </tr>
              <tr>
                <th>Imperative</th>
                <td>{entry.grammar.principalParts.imperative || "—"}</td>
              </tr>
              <tr>
                <th>Masdar</th>
                <td>{entry.grammar.principalParts.masdar || "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="section-card">
        <div className="section-heading">
          <h2>Derivational status</h2>
        </div>
        <DetailList
          items={[
            { label: "Verb formation", value: entry.derivation.verbFormation },
            {
              label: "Verb formation stem",
              value: formationStemValue,
              plainText: entry.derivation.verbFormationStem,
            },
            {
              label: "POS of formation stem",
              value: entry.derivation.posVerbFormationStem,
            },
            {
              label: "Formation stem mismatch",
              value: entry.derivation.formationStemDoesNotMatch,
            },
            { label: "Variation", value: entry.derivation.variation },
          ]}
        />
        <div className="tag-row">
          {Object.entries(entry.derivation.flags)
            .filter(([, value]) => value.trim())
            .map(([key, value]) => (
              <span key={key} className="tag-chip">
                {key}: {value}
              </span>
            ))}
        </div>
      </section>

      {entry.derivedFrom.length ? (
        <section className="section-card">
          <div className="section-heading">
            <h2>Derived from</h2>
          </div>
          <div className="link-list">
            {entry.derivedFrom.map((item) => (
              <Link key={`${entry.id}-${item.entryId}`} to={`/verb/${item.entryId}`} className="link-chip">
                {item.stem} {item.infinitive}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {entry.outgoingDerivatives.length ? (
        <section className="section-card">
          <div className="section-heading">
            <h2>Outgoing derivatives</h2>
          </div>
          <div className="link-list">
            {entry.outgoingDerivatives.map((item) => (
              <Link key={`${entry.id}-${item.entryId}`} to={`/verb/${item.entryId}`} className="link-chip">
                {item.stem} {item.infinitive}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <DefinitionPanel entry={entry} />

      <section className="section-card">
        <div className="section-heading">
          <h2>References</h2>
        </div>
        <DetailList
          items={[
            { label: "Reference", value: entry.references.reference },
            { label: "Notes", value: entry.references.notes },
            { label: "Comments", value: entry.references.comments },
          ]}
        />
      </section>
    </div>
  );
}
