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

function locationOptions(launches: Launch[]): string[] {
  const locations = launches.map((launch) => launch.location).filter(Boolean);
  return Array.from(new Set(locations)).sort((a, b) => a.localeCompare(b));
}

function statusClass(status: string): string {
  const normalized = status.toLowerCase();

  if (normalized.includes("go") || normalized.includes("success")) {
    return "border-emerald-700 bg-emerald-950 text-emerald-100";
  }

  if (normalized.includes("tbc") || normalized.includes("tbd") || normalized.includes("confirm")) {
    return "border-amber-700 bg-amber-950 text-amber-100";
  }

  if (normalized.includes("fail") || normalized.includes("hold") || normalized.includes("scrub")) {
    return "border-red-700 bg-red-950 text-red-100";
  }

  return "border-sky-700 bg-sky-950 text-sky-100";
}

function isCompletedStatus(status: string): boolean {
  const normalized = status.toLowerCase();
  return normalized.includes("success") || normalized.includes("failure") || normalized.includes("failed");
}

function LaunchImage({ launch }: { launch: Launch }) {
  if (!launch.imageUrl) {
    return (
      <div className="flex aspect-video w-full items-center justify-center border border-neutral-800 bg-neutral-950 text-sm text-neutral-500 sm:aspect-square sm:w-40">
        No image
      </div>
    );
  }

  const image = (
    <img
      alt=""
      className="aspect-video w-full border border-neutral-800 bg-neutral-950 object-cover sm:aspect-square sm:w-40"
      loading="lazy"
      referrerPolicy="no-referrer"
      src={launch.imageUrl}
    />
  );

  return (
    <a href={launch.imageUrl} rel="noreferrer" target="_blank">
      {image}
    </a>
  );
}

function LaunchTitle({ launch }: { launch: Launch }) {
  if (!launch.infoUrl) {
    return <h2 className="text-xl font-semibold text-white">{launch.name}</h2>;
  }

  return (
    <h2 className="text-xl font-semibold text-white">
      <a className="hover:text-sky-200" href={launch.infoUrl} rel="noreferrer" target="_blank">
        {launch.name}
      </a>
    </h2>
  );
}

function LaunchRow({ launch, now, featured }: { launch: Launch; now: number; featured: boolean }) {
  return (
    <li className={"grid gap-4 border-t py-5 sm:grid-cols-[10rem_1fr] " + (featured ? "border-sky-800 bg-sky-950/20 px-3" : "border-neutral-800")}>
      <LaunchImage launch={launch} />
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {featured ? <span className="border border-sky-500 bg-sky-900 px-2 py-1 text-xs font-medium text-sky-100">Next launch</span> : null}
          <span className={"border px-2 py-1 text-xs font-medium " + statusClass(launch.status)}>{launch.status}</span>
          <span className="border border-neutral-700 px-2 py-1 font-mono text-xs text-neutral-300">{formatCountdown(launch.net, now)}</span>
        </div>
        <LaunchTitle launch={launch} />
        <p className="mt-2 text-sm text-neutral-300">NET {formatDate(launch.net)}</p>
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
  const [location, setLocation] = useState("All locations");
  const [now, setNow] = useState(Date.now());
  const isLoading = !isLaunchFeed(rawFeed);
  const feed = isLaunchFeed(rawFeed) ? rawFeed : emptyLaunchFeed;
  const providers = useMemo(() => providerOptions(feed.launches), [feed.launches]);
  const locations = useMemo(() => locationOptions(feed.launches), [feed.launches]);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleLaunches = feed.launches.filter((launch) => {
    if (isCompletedStatus(launch.status)) {
      return false;
    }

    const matchesProvider = provider === "All providers" || launch.provider === provider;
    const matchesLocation = location === "All locations" || launch.location === location;
    const searchable = [launch.name, launch.provider, launch.rocket, launch.pad, launch.location, launch.status].join(" ").toLowerCase();
    return matchesProvider && matchesLocation && (!normalizedQuery || searchable.includes(normalizedQuery));
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl">
        <header className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-sm uppercase tracking-[0.18em] text-sky-300">Launch Library 2</p>
            <a
              aria-label="View source on GitHub"
              className="border border-neutral-700 px-3 py-1.5 text-sm font-medium text-neutral-300 hover:border-sky-400 hover:text-sky-200"
              href="https://github.com/Bradyac/launch-pad-lakebed"
              rel="noreferrer"
              target="_blank"
            >
              GitHub
            </a>
          </div>
          <div className="mt-2">
            <div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Launch Pad</h1>
              <p className="mt-3 max-w-2xl text-neutral-300">The next 10 scheduled orbital launches. Data updates automatically from TheSpaceDevs once per day.</p>
            </div>
          </div>
          <div className="mt-4 text-sm text-neutral-500">
            {feed.fetchedAt ? (
              <span>
                Last fetched from{" "}
                <a className="text-neutral-300 hover:text-sky-200" href="https://thespacedevs.com/llapi" rel="noreferrer" target="_blank">
                  TheSpaceDevs
                </a>{" "}
                {formatDate(feed.fetchedAt)}. Next fetch after {formatDate(feed.nextRefreshAt)}.
              </span>
            ) : null}
          </div>
        </header>

        <section className="mb-6 grid gap-3 lg:grid-cols-[1fr_16rem_16rem]">
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
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-300">Location</span>
            <select
              className="h-11 w-full border border-neutral-700 bg-neutral-950 px-3 text-white outline-none focus:border-sky-400"
              value={location}
              onInput={(event) => setLocation((event.currentTarget as HTMLSelectElement).value)}
            >
              <option>All locations</option>
              {locations.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        </section>

        {isLoading ? (
          <div className="border-y border-neutral-800 py-12 text-center text-neutral-400">Loading upcoming launches...</div>
        ) : feed.error && feed.launches.length > 0 ? (
          <div className="mb-6 border border-amber-900 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">Showing cached data because the latest fetch failed: {feed.error}</div>
        ) : feed.error ? (
          <div className="mb-6 border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-100">{feed.error}</div>
        ) : null}

        {!isLoading && !feed.error && visibleLaunches.length === 0 ? (
          <div className="border-y border-neutral-800 py-12 text-center text-neutral-400">No launches match the current filters.</div>
        ) : null}

        <ul className="border-b border-neutral-800">
          {visibleLaunches.map((launch, index) => (
            <LaunchRow featured={index === 0} key={launch.id} launch={launch} now={now} />
          ))}
        </ul>

        <footer className="py-8 text-sm text-neutral-500">
          Built with{" "}
          <a className="text-neutral-300 hover:text-sky-200" href="https://lakebed.dev/" rel="noreferrer" target="_blank">
            Lakebed
          </a>{" "}
          and Codex. Launch data from{" "}
          <a className="text-neutral-300 hover:text-sky-200" href="https://thespacedevs.com/" rel="noreferrer" target="_blank">
            TheSpaceDevs
          </a>
          .
        </footer>
      </section>
    </main>
  );
}
