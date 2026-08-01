import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

const PRIVACY_URL = 'https://kallan-randall.github.io/plateato/privacy.html';
const DELETE_ACCOUNT_URL = 'https://kallan-randall.github.io/plateato/delete-account.html';

export const metadata: Metadata = {
  title: 'Plateato — Know your kitchen',
  description:
    'A shared pantry and shopping list for your household. Track what you have, use it before it expires, and shop from one list everyone can update.',
  openGraph: {
    title: 'Plateato — Know your kitchen',
    description:
      'A shared pantry and shopping list for your household. Track what you have, use it before it expires, and shop from one list everyone can update.',
    type: 'website',
  },
};

const features = [
  {
    title: 'Know what you have',
    body: 'Add items in seconds from a built-in catalog with smart defaults for units, storage location, and shelf life. Organized by where things actually live — fridge, freezer, pantry, spice rack.',
  },
  {
    title: 'Waste less',
    body: 'Color-coded expiration indicators show what is fine, what is close, and what is past. The dashboard surfaces what needs using before it goes bad.',
  },
  {
    title: 'Shop together',
    body: 'One shared list for the whole household, grouped by aisle and checked off as you go. Everyone sees the same list, so nobody buys milk twice.',
  },
];

const screenshots = [
  { src: '/screenshots/pantry.png', alt: 'Pantry grouped by location with expiration indicators', caption: 'Your pantry, by location' },
  { src: '/screenshots/home.png', alt: 'Dashboard showing expiring items and a shopping snapshot', caption: 'What needs attention' },
  { src: '/screenshots/shopping.png', alt: 'Shopping list grouped by category', caption: 'One shared list' },
  { src: '/screenshots/add-item.png', alt: 'Add item screen with smart defaults', caption: 'Add in seconds' },
];

export default function Home() {
  return (
    <>
      <section className="mx-auto flex w-full max-w-5xl flex-col items-start gap-6 px-6 py-14 md:py-28">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-6xl">
          Know what&rsquo;s in your kitchen.
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-foreground-secondary">
          Plateato is a shared pantry and shopping list for your household. Track what you have, use
          it before it expires, and shop from one list everyone can update.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/login"
            className="flex h-12 items-center rounded-xl bg-primary px-6 font-medium text-on-primary"
          >
            Open the app
          </Link>
          <Link
            href="#features"
            className="flex h-12 items-center rounded-xl border border-border px-6 font-medium text-foreground"
          >
            See how it works
          </Link>
        </div>
        <p className="text-sm text-foreground-secondary">
          Free, no ads. Also in closed beta on Android.
        </p>
      </section>

      <section id="features" className="border-t border-border bg-background-element">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-10 px-6 py-16 md:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold text-primary">{feature.title}</h2>
              <p className="leading-relaxed text-foreground-secondary">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Built for the way you actually cook
        </h2>
        {/* A 4-up grid squeezes these to ~144px on a phone, where the UI in
            them is unreadable. Below md they become a swipeable row instead,
            so each stays large enough to actually see. */}
        <div className="-mx-6 flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-x-visible md:px-0 md:pb-0">
          {screenshots.map((shot) => (
            <figure key={shot.src} className="flex w-56 shrink-0 snap-start flex-col gap-3 md:w-auto">
              <Image
                src={shot.src}
                alt={shot.alt}
                width={440}
                height={953}
                // ~226px in the desktop grid, 224px in the mobile carousel —
                // without this Next assumes full viewport width and serves far
                // larger variants than these slots need.
                sizes="226px"
                className="w-full rounded-xl border border-border"
              />
              <figcaption className="text-sm text-foreground-secondary">{shot.caption}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-10 text-sm text-foreground-secondary sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Plateato</span>
          <nav className="flex flex-wrap gap-x-4">
            <a href={PRIVACY_URL} className="py-2 hover:text-foreground">
              Privacy policy
            </a>
            <a href={DELETE_ACCOUNT_URL} className="py-2 hover:text-foreground">
              Delete your account
            </a>
            <Link href="/login" className="py-2 hover:text-foreground">
              Sign in
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
