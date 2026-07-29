import Link from 'next/link';

export default function EmailConfirmedPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl text-on-primary">
        ✓
      </div>
      <h1 className="text-xl font-semibold text-primary">Email confirmed</h1>
      <p className="text-foreground-secondary">
        Your Plateato account is ready. Sign in with your email and password to continue.
      </p>
      <Link
        href="/login"
        className="mt-2 flex h-12 w-full items-center justify-center rounded-xl bg-primary font-medium text-on-primary"
      >
        Continue to sign in
      </Link>
    </div>
  );
}
