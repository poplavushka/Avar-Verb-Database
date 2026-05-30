import { Link } from "react-router-dom";

import { appConfig, getGithubCsvUrl } from "../lib/config";
import type { Dataset } from "../lib/types";

type HomePageProps = {
  dataset: Dataset;
};

export function HomePage({ dataset }: HomePageProps) {
  const githubCsvUrl = getGithubCsvUrl();

  return (
    <div className="page page-home">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Morphology, derivation, valency, examples</p>
          <h1>Avar Verbal Database</h1>
          <p className="hero-text">
            Welcome to Avar Verbal Database. It contains information about the morphology,
            valency, and derivation of Avar verbs.
          </p>
          <div className="hero-actions">
            <Link to="/dictionary" className="primary-action">
              Open dictionary
            </Link>
            <a
              href={githubCsvUrl ?? appConfig.localCsvUrl}
              className="secondary-action"
              target="_blank"
              rel="noreferrer"
            >
              Raw CSV
            </a>
          </div>
        </div>
        <div className="hero-stats">
          <div className="stat-card">
            <strong>{dataset.meta.entryCount}</strong>
            <span>Grouped verb entries</span>
          </div>
          <div className="stat-card">
            <strong>{dataset.meta.definitionCount}</strong>
            <span>Definitions</span>
          </div>
          <div className="stat-card">
            <strong>{dataset.meta.contextCount}</strong>
            <span>Example contexts</span>
          </div>
        </div>
      </section>

      <section className="info-grid">
        <article className="info-card">
          <h2>What can be searched</h2>
          <p>
            Search across stems, infinitives, definitions, Russian glosses,
            valency frames, and example contexts. Filters cover verb class,
            derivational type, transitivity, and selected derivational flags.
          </p>
        </article>
        <article className="info-card">
          <h2>How to use</h2>
          <p>
            Search is available in Cyrillic and Latin transliteration, by Russian
            translation, and with regular expressions.
          </p>
        </article>
        <article className="info-card">
          <h2>Citation</h2>
          <p>
            Cite the database as <em>{appConfig.title}</em>, static interface generated from the
            annotated CSV dataset. Include the repository URL and generation date from the site
            metadata when publishing results.
          </p>
        </article>
        <article className="info-card">
          <h2>Recently updated</h2>
          <p>
            The current dataset was generated on{" "}
            <strong>{new Date(dataset.meta.generatedAt).toLocaleString()}</strong>. Row-level
            version history is not available in the source CSV, so no finer update feed is
            shown yet.
          </p>
        </article>
      </section>
    </div>
  );
}
