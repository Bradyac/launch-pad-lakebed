import { useQuery } from "lakebed/client";
import { useEffect, useMemo, useState } from "preact/hooks";
import type { Launch, LaunchFeed } from "../shared/launches";
import { emptyLaunchFeed } from "../shared/launches";

function formatDate(value: string): string {
  if (!value) {
    return "TBD";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatCountdown(value: string, now: number): string {
  if (!value) {
    return "Awaiting time";
  }

  const diff = Date.parse(value) - now;
  const abs = Math.abs(diff);
  const day = 24 * 60 * 60 * 1000;
  const hour = 60 * 60 * 1000;
  const minute = 60 * 1000;
  const days = Math.floor(abs / day);
  const hours = Math.floor((abs % day) / hour);
  const minutes = Math.floor((abs % hour) / minute);
  const label = days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${minutes}m` : `${Math.max(minutes, 0)}m`;

  return diff >= 0 ? "T-" + label : "T+" + label;
}

function isLaunchFeed(value: unknown): value is LaunchFeed {
  return Boolean(value && typeof value === "object" && Array.isArray((value as LaunchFeed).launches));
}

function providerOptions(launches: Launch[]): string[] {
  const providers = launches.map((launch) => launch.provider).filter(Boolean);
  return Array.from(new Set(providers)).sort((a, b) => a.localeCompare(b));
}

function LaunchImage({ launch }: { launch: Launch }) {
  if (!launch.imageUrl) {
    return (
      <div className="flex aspect-video w-full items-center justify-center border border-neutral-800 bg-neutral-950 text-sm text-neutral-500 sm:aspect-square sm:w-36">
        No image
      </div>
    );
  }

  return (
    <img
      alt=""
      className="aspect-video w-full border border-neutral-800 bg-neutral-950 object-cover sm:aspect-square sm:w-36"
      loading="lazy"
      referrerPolicy="no-referrer"
      src={launch.imageUrl}
    />
  );
}

function LaunchRow({ launch, now }: { launch: Launch; now: number }) {
  return (
    <li className="grid gap-4 border-t border-neutral-800 py-5 sm:grid-cols-[9rem_1fr]">
      <LaunchImage launch={launch} />
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="border border-sky-700 bg-sky-950 px-2 py-1 text-xs font-medium text-sky-100">{launch.status}</span>
          <span className="border border-neutral-700 px-2 py-1 font-mono text-xs text-neutral-300">{formatCountdown(launch.net, now)}</span>
        </div>
        <h2 className="text-xl font-semibold text-white">{launch.name}</h2>
        <p className="mt-2 text-sm text-neutral-300">{formatDate(launch.net)}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">Provider</dt>
            <dd className="mt-1 text-neutral-100">{launch.provider}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Rocket</dt>
            <dd className="mt-1 text-neutral-100">{launch.rocket}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Pad</dt>
            <dd className="mt-1 text-neutral-100">{launch.pad}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Location</dt>
            <dd className="mt-1 text-neutral-100">{launch.location}</dd>
          </div>
        </dl>
      </div>
    </li>
  );
}

export function App() {
  const rawFeed = useQuery<LaunchFeed>("launches");
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("All providers");
  const [now, setNow] = useState(Date.now());
  const isLoading = !isLaunchFeed(rawFeed);
  const feed = isLaunchFeed(rawFeed) ? rawFeed : emptyLaunchFeed;
  const providers = useMemo(() => providerOptions(feed.launches), [feed.launches]);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleLaunches = feed.launches.filter((launch) => {
    const matchesProvider = provider === "All providers" || launch.provider === provider;
    const searchable = [launch.name, launch.provider, launch.rocket, launch.pad, launch.location, launch.status].join(" ").toLowerCase();
    return matchesProvider && (!normalizedQuery || searchable.includes(normalizedQuery));
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl">
        <header className="mb-6">
          <p className="font-mono text-sm uppercase tracking-[0.18em] text-sky-300">Launch Library 2</p>
          <div className="mt-2">
            <div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Launch Pad</h1>
              <p className="mt-3 max-w-2xl text-neutral-300">The next 10 scheduled orbital launches. Data updates automatically from TheSpaceDevs once per day.</p>
            </div>
          </div>
          <div className="mt-4 text-sm text-neutral-500">
            {feed.fetchedAt ? <span>Last fetched from TheSpaceDevs {formatDate(feed.fetchedAt)}. Next fetch after {formatDate(feed.nextRefreshAt)}.</span> : null}
          </div>
        </header>

        <section className="mb-6 grid gap-3 sm:grid-cols-[1fr_16rem]">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-300">Search</span>
            <input
              className="h-11 w-full border border-neutral-700 bg-neutral-950 px-3 text-white outline-none placeholder:text-neutral-600 focus:border-sky-400"
              placeholder="Mission, rocket, pad, status"
              value={query}
              onInput={(event) => setQuery((event.currentTarget as HTMLInputElement).value)}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-300">Provider</span>
            <select
              className="h-11 w-full border border-neutral-700 bg-neutral-950 px-3 text-white outline-none focus:border-sky-400"
              value={provider}
              onInput={(event) => setProvider((event.currentTarget as HTMLSelectElement).value)}
            >
              <option>All providers</option>
              {providers.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        </section>

        {isLoading ? (
          <div className="border-y border-neutral-800 py-12 text-center text-neutral-400">Loading upcoming launches...</div>
        ) : feed.error ? (
          <div className="mb-6 border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-100">{feed.error}</div>
        ) : null}

        {!isLoading && !feed.error && visibleLaunches.length === 0 ? (
          <div className="border-y border-neutral-800 py-12 text-center text-neutral-400">No launches match the current filters.</div>
        ) : null}

        <ul className="border-b border-neutral-800">
          {visibleLaunches.map((launch) => (
            <LaunchRow key={launch.id} launch={launch} now={now} />
          ))}
        </ul>
      </section>
    </main>
  );
}
