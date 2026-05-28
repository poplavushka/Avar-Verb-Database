type BookmarkButtonProps = {
  active: boolean;
  onToggle: () => void;
};

export function BookmarkButton({ active, onToggle }: BookmarkButtonProps) {
  return (
    <button
      type="button"
      className={`bookmark-button ${active ? "is-active" : ""}`}
      onClick={onToggle}
      aria-pressed={active}
      title={active ? "Remove bookmark" : "Save bookmark"}
    >
      {active ? "Saved" : "Save"}
    </button>
  );
}
