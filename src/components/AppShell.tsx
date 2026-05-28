import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

import { appConfig, getGithubCsvUrl } from "../lib/config";
import { ThemeToggle } from "./ThemeToggle";

type AppShellProps = {
  children: ReactNode;
  theme: "light" | "dark";
  onToggleTheme: () => void;
};

export function AppShell({ children, theme, onToggleTheme }: AppShellProps) {
  const githubCsvUrl = getGithubCsvUrl();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <Link to="/" className="brand-mark">
            <span className="brand-kicker">Static dictionary</span>
            <span className="brand-title">{appConfig.title}</span>
          </Link>
        </div>
        <nav className="topbar-nav" aria-label="Primary">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/dictionary">Dictionary</NavLink>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <a href={githubCsvUrl ?? appConfig.localCsvUrl} target="_blank" rel="noreferrer">
            Raw CSV
          </a>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
