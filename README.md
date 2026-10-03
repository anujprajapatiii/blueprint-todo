# Blueprint To-do

A simple personal task list built with React, TypeScript, Vite, and Blueprint 6.

- Add, edit, complete, and delete tasks.
- Filter all, active, or completed tasks.
- Save automatically in this browser using localStorage.
- Optional WebMCP tools expose the same task actions to supported browsers.

## Storage and privacy

The website is static. Task titles stay in your browser; they are never committed to GitHub or sent to a backend. There is no account or cross-device sync. Clearing site data clears this list. The earlier Sites-hosted version used a separate database: existing tasks do not transfer automatically.

## Run locally

Requires Node 22.13 or newer.

```sh
npm ci
npm run dev
```

## Checks and production build

```sh
npm test
npm run build
npm run preview
```

## GitHub Pages

Set the repository's Pages source to **GitHub Actions**, then set the repository Actions variable `PAGES_ENABLED` to `true`. Until then, pushes run checks without attempting a deployment. Every push to `main` runs the storage tests, builds the static app, and deploys through `.github/workflows/deploy.yml`. Relative asset URLs support a repository subpath or custom domain. No deployment secrets or API keys are required.
