# GitHub Pages deployment

The production site is https://brunnojob.github.io/BadgeMasterfree/.

## Publish

1. Open repository Settings → Pages.
2. Set Source to GitHub Actions.
3. Push to `main`, or run **Publish BadgeMasterfree** manually from Actions.
4. Wait for the deployment job to succeed. Its environment links to the deployed page.

The workflow installs locked dependencies, runs tests, builds the static `dist/` directory, uploads it and deploys it with the official Pages actions. The repository already has a working Pages workflow. Pages availability for this public repository does not depend on Developer Program membership.

## Runtime

The app calls the public GitHub REST API directly from the browser. No OAuth app, token, secret, database or Vercel gateway is needed. Search and profile lookups are subject to public API limits. Requests have timeouts and display explicit errors.

The achievement checklist uses `localStorage` under `bm.plan.v2`. It is a single personal checklist for this browser, independent of the username being inspected. It is not synced to GitHub. If storage is blocked, the app remains usable for the current page session and can export the checklist as Markdown. The coauthor form is processed locally and its name/email are not saved or transmitted by the app.

The public GitHub API does not provide a complete authoritative achievement inventory. The UI displays public activity and guides, not verified badge ownership or automatic badge grants. Private contributions are not queried.

Stars, follows, sponsorships and pull requests are handled on GitHub using direct links. No write permission is requested.

## Vercel migration

`web/config.js` no longer selects a Vercel endpoint. `vercel.json` is removed, and the build explicitly includes only the static frontend files and selected artwork. The former frontend is archived under `legacy/web/`; the optional backend source and tests remain outside the deployed artifact. The historical server instructions are in `docs/LEGACY-SERVER.md`.

Repository changes do not automatically disconnect a Vercel Git integration or remove its hosted project. After the Pages deployment has been verified, the old Vercel project's Git connection can be disconnected separately. Preserve or export any member database before retiring infrastructure; the static migration does not move or delete those records.

## Local validation

```sh
npm ci
npm test
npm run build
python3 -m http.server 8080 --directory dist
```

The static build has no server routes. `npm start` remains the optional legacy backend development command; it is not the Pages preview command.
