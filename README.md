# GrowthLab — Blueprint in depth

An interactive growth experiment workspace built with React, TypeScript, Vite, and Blueprint 6. A richer companion to the original personal to-do app.

**Live:** https://anujprajapatiii.github.io/blueprint-todo/

## Explore

- A real Blueprint Table with frozen IDs, resizable columns, sorting, editable experiment names and traffic allocations, and context menus.
- Twenty-four sample experiments with search, status and owner filters, a board view, and CSV export.
- An inspector with editable hypotheses, searchable ownership, date ranges, rollout controls, results, and session activity.
- Interactive simulated analytics, light and dark themes, a command palette, and keyboard shortcuts.
- A component lab with 30+ Blueprint controls and patterns to try.
- The original task list, preserved at `#todo` with its existing storage and optional WebMCP tools.

Use **⌘/Ctrl K** to find an experiment, **N** to create one, **D** to switch appearance, **L** to open the component lab, and **?** for shortcut help. Shortcuts do not fire while typing in fields.

## Demo data and storage

All experiment names, metrics, teammates, activity, and results are illustrative. Charts and layouts are custom; the interactive controls use Blueprint. This is a UI showcase, not a statistical testing engine or a live analytics service.

The website is static. Experiments and tasks save locally in your browser under separate storage keys. They are never committed to GitHub or sent to a backend. There is no account, API key, or cross-device sync. Clearing site data clears local changes. The workspace menu can restore the sample experiments without affecting your tasks. Inspector activity and component-lab changes are session-only.

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

Set the repository's Pages source to **GitHub Actions**, then set the repository Actions variable `PAGES_ENABLED` to `true`. Every push to `main` runs tests, builds the static app, and deploys through `.github/workflows/deploy.yml`. Relative asset URLs support a repository subpath or custom domain. No deployment secrets or API keys are required.
