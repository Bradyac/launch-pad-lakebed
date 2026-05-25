# Launch Pad

A tiny rocket launch dashboard built with Lakebed.

Live app:

```txt
https://launch-pad.lakebed.app
```

## What It Is

Launch Pad shows the next 10 upcoming rocket launches using TheSpaceDevs Launch Library 2 API. It includes search, provider filtering, launch status, launch times, countdowns, pad/location info, and launch images when available.

The app keeps the Launch Library API call on the server and caches the result so it does not hit TheSpaceDevs on every page load.

## Why I Built It

This was a quick experiment with Lakebed, a new app runtime/CLI built by Theo, [@theo on X](https://x.com/theo). I wanted to try the basic Lakebed flow: create a capsule, add a little server logic, store something in the built-in database, deploy it, claim the deploy, and attach a nicer URL.

It was also an excuse to keep experimenting with Codex as a coding partner for building and deploying small ideas quickly.

The idea is a loose callback to an older launch dashboard I built years ago as a recent grad while learning Angular and serverless tools for the first time:

- Live Site: [Ground-Control](https://ground-control.netlify.app)
- Repos: [Bradyac/ground-control](https://github.com/Bradyac/ground-control), [Bradyac/ground-control-data-fetchers](https://github.com/Bradyac/ground-control-data-fetchers)

This is not meant to be a serious production app. It is just a small thing to kick the tires on Lakebed.

## Local Dev

```sh
npx lakebed@latest dev
```

The Launch Library base URL is a plain constant in `server/index.ts`, since this prototype only uses the public API.
