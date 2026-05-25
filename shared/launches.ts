export type Launch = {
  id: string;
  name: string;
  provider: string;
  rocket: string;
  net: string;
  pad: string;
  location: string;
  status: string;
  imageUrl: string;
};

export type LaunchFeed = {
  launches: Launch[];
  fetchedAt: string;
  nextRefreshAt: string;
  source: string;
  error: string;
};

export const emptyLaunchFeed: LaunchFeed = {
  launches: [],
  fetchedAt: "",
  nextRefreshAt: "",
  source: "",
  error: ""
};

