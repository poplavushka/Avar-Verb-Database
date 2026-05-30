import {
  startTransition,
  useDeferredValue,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Link, useSearchParams } from "react-router-dom";

import { exportEntriesAsCsv, exportEntriesAsXlsx } from "../lib/export";
import {
  buildSuggestions,
  filterEntries,
  sortEntries,
} from "../lib/search";
import type {
  Dataset,
  Entry,
  SearchField,
  SearchRecord,
  SearchState,
  SortOption,
} from "../lib/types";
import { ResultCard } from "../components/ResultCard";

type SearchPageProps = {
  dataset: Dataset;
  searchIndexById: Record<string, SearchRecord>;
  bookmarks: Set<string>;
  onToggleBookmark: (entryId: string) => void;
};

const PAGE_SIZE = 24;
const CYRILLIC_SYMBOLS = [
  "ӏ",
  "І",
  "гь",
  "гъ",
  "къ",
  "кь",
  "хъ",
  "гІ",
  "кІ",
  "хІ",
  "тІ",
  "цІ",
  "чІ",
  "лъ",
];
const LATIN_SYMBOLS = [
  "'",
  ":",
  "ː",
  "č",
  "š",
  "ž",
  "ɬ",
  "ƛ",
  "ħ",
  "ʕ",
  "χ",
  "ʁ",
  "q",
  "h",
  "q'",
  "k'",
  "t'",
  "c'",
  "č'",
  "c':",
  "č':",
  "k':",
  "ƛ'",
  "sː",
  "ɬː",
  "χː",
  "cː",
  "čː",
  "kː",
  "š:",
  "ja",
  "jo",
  "ju",
];

function parseBoolean(value: string | null, fallback = false) {
  if (value === null) {
    return fallback;
  }
  return value === "1";
}

function parseState(params: URLSearchParams): SearchState {
  return {
    query: params.get("q") ?? "",
    field: (params.get("field") as SearchField) || "stem0",
    useRegex: parseBoolean(params.get("regex")),
    translit: parseBoolean(params.get("translit")),
    verbClass: params.get("class") ?? "",
    verbFormation: params.get("formation") ?? "",
    transitivity: params.get("transitivity") ?? "",
    onlyBookmarks: parseBoolean(params.get("bookmarks")),
    onlyDerived: parseBoolean(params.get("derived")),
    onlyWithChildren: parseBoolean(params.get("children")),
    onlyCausative: parseBoolean(params.get("causative")),
    sort: (params.get("sort") as SortOption) || "alphabetical",
    page: Math.max(1, Number(params.get("page") ?? "1")),
  };
}

function updateSearchParams(
  params: URLSearchParams,
  patch: Record<string, string | number | boolean | null>,
) {
  const next = new URLSearchParams(params);

  Object.entries(patch).forEach(([key, value]) => {
    if (value === null || value === "" || value === false) {
      next.delete(key);
      return;
    }

    next.set(key, String(value === true ? 1 : value));
  });

  return next;
}

function countContexts(entry: Entry): number {
  return entry.definitions.reduce((sum, definition) => sum + definition.contexts.length, 0);
}

export function SearchPage({
  dataset,
  searchIndexById,
  bookmarks,
  onToggleBookmark,
}: SearchPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isPending, setIsPending] = useState(false);
  const [isSymbolKeyboardOpen, setIsSymbolKeyboardOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const datalistId = useId();
  const state = parseState(searchParams);
  const lastUrlQueryRef = useRef(state.query);
  const [queryDraft, setQueryDraft] = useState(state.query);
  const deferredQuery = useDeferredValue(queryDraft);
  const specialSymbols = state.translit ? LATIN_SYMBOLS : CYRILLIC_SYMBOLS;

  const filteredEntries = sortEntries(
    filterEntries(dataset.entries, searchIndexById, { ...state, query: deferredQuery }, bookmarks),
    state.sort,
    searchIndexById,
    { ...state, query: deferredQuery },
  );

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const currentPage = Math.min(state.page, totalPages);
  const visibleEntries = filteredEntries.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const suggestions = buildSuggestions(
    dataset.searchIndex,
    deferredQuery,
    state.translit,
    state.field,
  );

  useEffect(() => {
    if (queryDraft === state.query) {
      setIsPending(false);
    }
  }, [queryDraft, state.query]);

  useEffect(() => {
    if (lastUrlQueryRef.current === state.query) {
      return;
    }

    lastUrlQueryRef.current = state.query;
    setQueryDraft(state.query);
  }, [state.query]);

  useEffect(() => {
    if (queryDraft === state.query) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        setSearchParams(updateSearchParams(searchParams, { q: queryDraft, page: 1 }), {
          replace: true,
        });
        lastUrlQueryRef.current = queryDraft;
      });
    }, 160);

    return () => window.clearTimeout(timeoutId);
  }, [queryDraft, searchParams, setSearchParams, state.query]);

  useEffect(() => {
    if (state.page <= totalPages) {
      return;
    }

    startTransition(() => {
      setSearchParams(updateSearchParams(searchParams, { page: totalPages }), {
        replace: true,
      });
    });
  }, [searchParams, setSearchParams, state.page, totalPages]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typingContext =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if ((event.key === "/" || (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey))) && !typingContext) {
        event.preventDefault();
        inputRef.current?.focus();
      }

      if (event.altKey && event.key === "ArrowRight" && currentPage < totalPages) {
        event.preventDefault();
        startTransition(() => {
          setSearchParams(updateSearchParams(searchParams, { page: currentPage + 1 }));
        });
      }

      if (event.altKey && event.key === "ArrowLeft" && currentPage > 1) {
        event.preventDefault();
        startTransition(() => {
          setSearchParams(updateSearchParams(searchParams, { page: currentPage - 1 }));
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, searchParams, setSearchParams, totalPages]);

  function patchState(patch: Record<string, string | number | boolean | null>) {
    setIsPending(true);
    const next = updateSearchParams(searchParams, {
      q: queryDraft,
      ...patch,
      page: patch.page ?? (Object.hasOwn(patch, "page") ? patch.page : 1),
    });

    startTransition(() => {
      setSearchParams(next);
      window.requestAnimationFrame(() => setIsPending(false));
    });
  }

  function insertSearchSymbol(symbol: string) {
    const input = inputRef.current;
    const selectionStart = input?.selectionStart ?? queryDraft.length;
    const selectionEnd = input?.selectionEnd ?? selectionStart;
    const nextQuery =
      queryDraft.slice(0, selectionStart) + symbol + queryDraft.slice(selectionEnd);

    setQueryDraft(nextQuery);
    setIsPending(true);

    window.requestAnimationFrame(() => {
      const cursorPosition = selectionStart + symbol.length;
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(cursorPosition, cursorPosition);
    });
  }

  const searchSummary = visibleEntries.reduce(
    (summary, entry) => {
      summary.definitions += entry.definitions.length;
      summary.contexts += countContexts(entry);
      return summary;
    },
    { definitions: 0, contexts: 0 },
  );

  return (
    <div className="page">
      <section className="search-hero">
        <div>
          <p className="eyebrow">Avar verbal database</p>
          <h1>Dictionary search</h1>
        </div>
        <div className="export-row">
          <button type="button" className="secondary-action" onClick={() => exportEntriesAsCsv(filteredEntries)}>
            Export CSV
          </button>
          <button
            type="button"
            className="secondary-action"
            onClick={() => {
              void exportEntriesAsXlsx(filteredEntries);
            }}
          >
            Export XLSX
          </button>
        </div>
      </section>

      <section className="search-layout">
        <aside className="filter-panel">
          <label className="field-block">
            <span>Search query</span>
            <input
              ref={inputRef}
              type="search"
              value={queryDraft}
              list={datalistId}
              placeholder="stem, gloss, valency frame, context"
              onChange={(event) => {
                setQueryDraft(event.target.value);
                setIsPending(true);
              }}
            />
            <datalist id={datalistId}>
              {suggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </label>

          <div className="special-keyboard">
            <button
              type="button"
              className="keyboard-toggle"
              aria-expanded={isSymbolKeyboardOpen}
              onClick={() => setIsSymbolKeyboardOpen((isOpen) => !isOpen)}
            >
              {isSymbolKeyboardOpen ? "hide keyboard" : "keyboard"}
            </button>
            {isSymbolKeyboardOpen ? (
              <div className="symbol-grid" aria-label="Special search symbols">
                {specialSymbols.map((symbol) => (
                  <button
                    key={symbol}
                    type="button"
                    className="symbol-key"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => insertSearchSymbol(symbol)}
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <label className="field-block">
            <span>Filters</span>
            <select
              value={state.field}
              onChange={(event) => patchState({ field: event.target.value })}
            >
              <option value="stem0">Stem0</option>
              <option value="stem">Stem</option>
              <option value="infinitive">Infinitive</option>
              <option value="stem1">Stem1</option>
              <option value="stem2">Stem2</option>
              <option value="all">All fields</option>
            </select>
          </label>

          <div className="field-block">
            <span>Search script</span>
            <div className="segmented-toggle" role="group" aria-label="Search script">
              <button
                type="button"
                className={!state.translit ? "toggle-chip is-active" : "toggle-chip"}
                onClick={() => patchState({ translit: false })}
              >
                Cyrillic
              </button>
              <button
                type="button"
                className={state.translit ? "toggle-chip is-active" : "toggle-chip"}
                onClick={() => patchState({ translit: true })}
              >
                Latin
              </button>
            </div>
          </div>

          <div className="checkbox-list">
            <label>
              <input
                type="checkbox"
                checked={state.useRegex}
                onChange={(event) => patchState({ regex: event.target.checked })}
              />
              Use regular expressions
            </label>
            <label>
              <input
                type="checkbox"
                checked={state.onlyBookmarks}
                onChange={(event) => patchState({ bookmarks: event.target.checked })}
              />
              Saved entries
            </label>
            <label>
              <input
                type="checkbox"
                checked={state.onlyDerived}
                onChange={(event) => patchState({ derived: event.target.checked })}
              />
              Derived verbs
            </label>
            <label>
              <input
                type="checkbox"
                checked={state.onlyWithChildren}
                onChange={(event) => patchState({ children: event.target.checked })}
              />
              Verbs with derivatives
            </label>
            <label>
              <input
                type="checkbox"
                checked={state.onlyCausative}
                onChange={(event) => patchState({ causative: event.target.checked })}
              />
              Causatives
            </label>
          </div>

          <label className="field-block">
            <span>Verb class</span>
            <select
              value={state.verbClass}
              onChange={(event) => patchState({ class: event.target.value })}
            >
              <option value="">All classes</option>
              {dataset.filters.verbClass.values?.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="field-block">
            <span>Derivational type</span>
            <select
              value={state.verbFormation}
              onChange={(event) => patchState({ formation: event.target.value })}
            >
              <option value="">All types</option>
              {dataset.filters.verbFormation.values?.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="field-block">
            <span>Transitivity</span>
            <select
              value={state.transitivity}
              onChange={(event) => patchState({ transitivity: event.target.value })}
            >
              <option value="">Any</option>
              {dataset.filters.transitivity.values?.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="field-block">
            <span>Sort results</span>
            <select value={state.sort} onChange={(event) => patchState({ sort: event.target.value })}>
              <option value="alphabetical">Alphabetically</option>
              <option value="verbClass">By verb class</option>
              <option value="valency">By number of valency frames</option>
              <option value="derivation">By derivational type</option>
              <option value="completeness">By completeness of entry</option>
            </select>
          </label>
        </aside>

        <section className="results-panel">
          <div className="results-toolbar">
            <div>
              <strong>{filteredEntries.length}</strong> entries found
              <span className="muted-block result-page-summary">
                {searchSummary.definitions} definitions · {searchSummary.contexts} examples on this page
              </span>
            </div>
            <div className="share-box">
              <span className="muted-block">You can share your search results.</span>
              {isPending ? <span className="loading-dot">Updating…</span> : null}
            </div>
          </div>

          {visibleEntries.length ? (
            <div className="result-grid">
              {visibleEntries.map((entry) => (
                <ResultCard
                  key={entry.id}
                  entry={entry}
                  bookmarked={bookmarks.has(entry.id)}
                  translit={state.translit}
                  onToggleBookmark={() => onToggleBookmark(entry.id)}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2>No entries matched this query.</h2>
              <p>Try clearing some filters or searching in all fields.</p>
            </div>
          )}

          <div className="pagination-row">
            <button
              type="button"
              className="secondary-action"
              onClick={() => patchState({ page: Math.max(1, currentPage - 1) })}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className="secondary-action"
              onClick={() => patchState({ page: Math.min(totalPages, currentPage + 1) })}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>

          <div className="result-footer-note">
            <Link to="/dictionary">Share this filtered view</Link> or open an individual verb page
            for the full entry.
          </div>
        </section>
      </section>
    </div>
  );
}
