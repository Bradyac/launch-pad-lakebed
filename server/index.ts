import { capsule, query, string, table } from "lakebed/server";
import type { Launch, LaunchFeed } from "../shared/launches";
import { emptyLaunchFeed } from "../shared/launches";

const CACHE_KEY = "upcoming-launches";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const API_BASE_URL = "https://ll.thespacedevs.com/2.3.0";

type CacheRow = {
  id: string;
  key: string;
  payload: string;
  fetchedAt: string;
  createdAt: string;
  updatedAt: string;
};

type ApiLaunch = {
  id?: string;
  name?: string;
  net?: string;
  url?: string;
  image_url?: string;
  image?: {
    image_url?: string;
    thumbnail_url?: string;
  };
  launch_service_provider?: {
    name?: string;
  };
  rocket?: {
    configuration?: {
      full_name?: string;
      name?: string;
    };
  };
  mission?: {
    name?: string;
  };
  pad?: {
    name?: string;
    location?: {
      name?: string;
    };
  };
  status?: {
    name?: string;
  };
};

type ApiResponse = {
  results?: ApiLaunch[];
};

function upcomingLaunchesUrl(baseUrl: string): string {
  return baseUrl + "/launches/upcoming/?limit=20&mode=detailed&ordering=net";
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeLaunch(launch: ApiLaunch): Launch {
  const missionName = text(launch.mission?.name, text(launch.name, "Unnamed mission"));
  const imageUrl = text(launch.image?.image_url, text(launch.image?.thumbnail_url, text(launch.image_url, "")));

  return {
    id: text(launch.id, missionName),
    name: missionName,
    provider: text(launch.launch_service_provider?.name, "Unknown provider"),
    rocket: text(launch.rocket?.configuration?.full_name, text(launch.rocket?.configuration?.name, "Unknown rocket")),
    net: text(launch.net, ""),
    pad: text(launch.pad?.name, "Unknown pad"),
    location: text(launch.pad?.location?.name, "Unknown location"),
    status: text(launch.status?.name, "Unknown"),
    imageUrl,
    infoUrl: text(launch.url, "")
  };
}

function isCompletedLaunch(launch: Launch): boolean {
  const status = launch.status.toLowerCase();
  return status.includes("success") || status.includes("failure") || status.includes("failed");
}

function parseFeed(payload: string): LaunchFeed | null {
  try {
    const parsed = JSON.parse(payload) as LaunchFeed;
    return Array.isArray(parsed.launches) ? parsed : null;
  } catch {
    return null;
  }
}

function cacheRow(ctx: { db: Record<string, { where: (field: string, value: unknown) => { all: () => CacheRow[] } }> }): CacheRow | null {
  return ctx.db.launchCache.where("key", CACHE_KEY).all()[0] ?? null;
}

function cacheIsFresh(row: CacheRow | null): boolean {
  if (!row) {
    return false;
  }

  return Date.now() - Date.parse(row.fetchedAt) < CACHE_TTL_MS;
}

async function fetchLaunchFeed(ctx: {
  db: Record<string, { where: (field: string, value: unknown) => { all: () => CacheRow[] }; insert: (value: unknown) => CacheRow; update: (id: string, patch: unknown) => void }>;
}): Promise<LaunchFeed> {
  const baseUrl = API_BASE_URL;
  const source = upcomingLaunchesUrl(baseUrl);
  const response = await fetch(source, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("Launch Library returned HTTP " + String(response.status));
  }

  const body = (await response.json()) as ApiResponse;
  const fetchedAt = new Date().toISOString();
  const feed: LaunchFeed = {
    launches: (body.results ?? []).map(normalizeLaunch).filter((launch) => !isCompletedLaunch(launch)).slice(0, 10),
    fetchedAt,
    nextRefreshAt: new Date(Date.parse(fetchedAt) + CACHE_TTL_MS).toISOString(),
    source,
    error: ""
  };
  const row = cacheRow(ctx);
  const payload = JSON.stringify(feed);

  if (row) {
    ctx.db.launchCache.update(row.id, { payload, fetchedAt });
  } else {
    ctx.db.launchCache.insert({ key: CACHE_KEY, payload, fetchedAt });
  }

  return feed;
}

async function cachedLaunchFeed(ctx: {
  db: Record<string, { where: (field: string, value: unknown) => { all: () => CacheRow[] }; insert: (value: unknown) => CacheRow; update: (id: string, patch: unknown) => void }>;
  log: { warn: (message: string, data?: unknown) => void };
}): Promise<LaunchFeed> {
  const row = cacheRow(ctx);
  const cached = row ? parseFeed(row.payload) : null;

  if (cached && cacheIsFresh(row)) {
    return cached;
  }

  try {
    return await fetchLaunchFeed(ctx);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load launches.";
    ctx.log.warn("launch fetch failed", { message });

    if (cached) {
      return { ...cached, error: message };
    }

    return {
      ...emptyLaunchFeed,
      source: upcomingLaunchesUrl(API_BASE_URL),
      error: message
    };
  }
}

export default capsule({
  name: "Launch Pad",

  schema: {
    launchCache: table({
      key: string(),
      payload: string(),
      fetchedAt: string()
    })
  },

  queries: {
    launches: query((ctx) => cachedLaunchFeed(ctx))
  }
});
