export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-start gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Know your kitchen.
      </h1>
      <p className="max-w-md text-foreground-secondary">
        The web app scaffold is live — auth, pantry, and shopping screens land in the phases
        after this one.
      </p>
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="rounded-full bg-success/10 px-3 py-1 text-success">success</span>
        <span className="rounded-full bg-warning/10 px-3 py-1 text-warning">warning</span>
        <span className="rounded-full bg-danger/10 px-3 py-1 text-danger">danger</span>
        <span className="rounded-full bg-accent/10 px-3 py-1 text-accent">accent</span>
      </div>
      <div className="rounded-2xl border border-border bg-background-element p-6">
        <p className="text-sm text-foreground-secondary">
          This card uses <code>background-element</code> and <code>border</code> — confirms the
          token wiring from <code>@plateato/core</code> reached Tailwind.
        </p>
      </div>
    </div>
  );
}
