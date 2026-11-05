# BadgeMasterfree

An open source GitHub achievement workbench by [brunnojob](https://github.com/brunnojob).

[Open the lab](https://brunnojob.github.io/BadgeMasterfree/) · [Deployment guide](docs/SETUP.md)

BadgeMasterfree brings achievement planning, public profile analysis and open source discovery into one browser app. Its charcoal, lime and monospace visual identity builds on the project's own design. GitHubCrazy's three-tool navigation inspired the organization; the interface and implementation are original.

## Tools

- Achievement workbench: six contribution guides, a local checklist and a downloadable Markdown plan.
- Profile analysis: public repository, follower and following counts, plus public merged PR search.
- Collaboration helper: validated `Co-authored-by` trailer generation and clipboard copy.
- Project discovery: public GitHub repository search with language filters and pagination.
- Developer discovery: public profile search with links to GitHub.

The app runs entirely on GitHub Pages. It requires no login, token, database or Vercel API. Stars, follows and contributions take place on GitHub. Checklist entries are personal notes stored in this browser, shared across profile lookups; they are not verified achievements. Export the plan to keep a portable copy.

GitHub controls achievement eligibility and display. Public metrics cannot verify all achievement conditions or private activity. This app automates preparation and organization, not the award of badges. Sponsors may involve paid support chosen separately on GitHub.

## Development

Use Node.js 24:

```sh
npm ci
npm test
npm run build
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080`. `dist/` contains only the static app and its selected badge artwork. All asset references are relative so the app works under `/BadgeMasterfree/`.

## Deployment

Pushes to `main` run tests, build the site and publish through `.github/workflows/pages.yml`. Select **GitHub Actions** as the Pages source. No deployment secrets are needed. Public API quotas apply; failures are shown in the app without inventing results.

## Previous server version

The previous OAuth and opt-in member directory UI is preserved in `legacy/web/`. Its server modules and tests remain available, with historical configuration in [LEGACY-SERVER.md](docs/LEGACY-SERVER.md). These files are excluded from the Pages build. Existing member records are not imported, deleted or exposed by the static app. The public version replaces in-app OAuth, member registration and mutual-connection queries with public discovery and direct GitHub links.

## Credits and license

Maintained by [brunnojob](https://github.com/brunnojob) · [brunnodev.store](https://brunnodev.store). Existing artwork and its history are retained in `Media/`; GitHub achievement names and images belong to their respective owners. See [LICENSE](LICENSE) for the repository's existing license.
