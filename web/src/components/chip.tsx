export function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-9 rounded-full border px-3 py-1.5 text-sm ${
        selected
          ? 'border-primary bg-primary text-on-primary'
          : 'border-border bg-transparent text-foreground'
      }`}
    >
      {label}
    </button>
  );
}
