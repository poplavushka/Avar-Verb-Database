type ThemeToggleProps = {
  theme: "light" | "dark";
  onToggle: () => void;
};

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button type="button" className="theme-toggle" onClick={onToggle}>
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
