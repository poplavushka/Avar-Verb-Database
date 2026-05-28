import { useEffect, useState } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";

import { AppShell } from "./components/AppShell";
import { appConfig } from "./lib/config";
import { buildSearchIndexMap } from "./lib/search";
import type { Dataset } from "./lib/types";
import { useLocalStorage } from "./lib/useLocalStorage";
import { HomePage } from "./pages/HomePage";
import { SearchPage } from "./pages/SearchPage";
import { VerbDetailPage } from "./pages/VerbDetailPage";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; dataset: Dataset; searchIndexById: ReturnType<typeof buildSearchIndexMap> }
  | { status: "error"; message: string };

export default function App() {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [bookmarkIds, setBookmarkIds] = useLocalStorage<string[]>("avar-bookmarks", []);
  const [theme, setTheme] = useLocalStorage<"light" | "dark">("avar-theme", "light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    let active = true;

    async function loadDataset() {
      try {
        const response = await fetch(appConfig.localDatasetUrl);
        if (!response.ok) {
          throw new Error(`Failed to load dataset: ${response.status}`);
        }

        const dataset = (await response.json()) as Dataset;
        if (!active) {
          return;
        }

        setLoadState({
          status: "ready",
          dataset,
          searchIndexById: buildSearchIndexMap(dataset.searchIndex),
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setLoadState({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown data loading error",
        });
      }
    }

    loadDataset();

    return () => {
      active = false;
    };
  }, []);

  const bookmarks = new Set(bookmarkIds);

  function toggleBookmark(entryId: string) {
    setBookmarkIds((current) =>
      current.includes(entryId)
        ? current.filter((value) => value !== entryId)
        : [...current, entryId],
    );
  }

  return (
    <HashRouter>
      <AppShell
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
      >
        {loadState.status === "loading" ? (
          <div className="page">
            <section className="section-card">
              <h1>Loading dataset</h1>
              <p>The static JSON index is being loaded into the client.</p>
            </section>
          </div>
        ) : null}

        {loadState.status === "error" ? (
          <div className="page">
            <section className="section-card">
              <h1>Dataset loading failed</h1>
              <p>{loadState.message}</p>
            </section>
          </div>
        ) : null}

        {loadState.status === "ready" ? (
          <Routes>
            <Route path="/" element={<HomePage dataset={loadState.dataset} />} />
            <Route
              path="/dictionary"
              element={
                <SearchPage
                  dataset={loadState.dataset}
                  searchIndexById={loadState.searchIndexById}
                  bookmarks={bookmarks}
                  onToggleBookmark={toggleBookmark}
                />
              }
            />
            <Route
              path="/verb/:id"
              element={
                <VerbDetailPage
                  dataset={loadState.dataset}
                  bookmarks={bookmarks}
                  onToggleBookmark={toggleBookmark}
                />
              }
            />
          </Routes>
        ) : null}
      </AppShell>
    </HashRouter>
  );
}
