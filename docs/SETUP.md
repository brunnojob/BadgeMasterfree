# Deployment and OAuth setup

Frontend: https://brunnojob.github.io/BadgeMasterfree/

API: https://badgemasterfree-api.vercel.app/api/gateway

## GitHub Pages

Settings → Pages → Source must be GitHub Actions. Pushes to `main` run tests, build `dist/` and deploy with the official Pages actions. The build includes only the frontend modules and selected badge images. Content-hashed module and stylesheet names prevent mixing old scripts with a new page.

GitHub Pages is the public site host. GitHub Pro and Developer Program membership do not turn Pages into a server for OAuth secrets or authenticated backend operations.

## OAuth API

The existing Vercel project `badgemasterfree-api` serves `api/gateway.mjs` and the server modules. It must be active with Git deployments enabled. `vercel.json` declares the build, output and API function duration. The API can also run on a Node.js 24 server using `npm start`.

Configure these production variables directly in the provider:

- `GITHUB_CLIENT_ID`: the existing GitHub OAuth App client ID.
- `GITHUB_CLIENT_SECRET`: the OAuth App client secret.
- `SESSION_SECRET`: a random secret of at least 32 characters for encrypted sessions and execution checkpoints.
- `FRONTEND_URL`: `https://brunnojob.github.io/BadgeMasterfree/`.

The GitHub OAuth App callback URL must match `FRONTEND_URL`, including `/BadgeMasterfree/`. `web/config.js` selects the API endpoint. OAuth uses state, PKCE and `prompt=select_account`. Scopes are `read:user public_repo user:follow`; the `public_repo` scope supports authenticated operations on public repositories, including Discussions. No raw GitHub token is returned to the browser.

`?action=status` reports configured variable names, readiness, callback and scopes without exposing secrets. Database readiness is unrelated to automation: the legacy community directory needs its separate database, but badge workflows do not.

## Workflow

1. Sign in with the account that should receive activity credit.
2. Load its public writable repositories or confirm creation of `ACCOUNT/badgemaster-lab`.
3. Select Pull Shark, YOLO, Pair Extraordinaire or Galaxy Brain.
4. Set quantity, title, exact content and optional automatic merge.
5. For Pair, provide the actual collaborator and confirm their contribution. Use their associated email or the derived GitHub noreply address.
6. For Galaxy, connect a different helper account and enable Discussions with an answerable Q&A category on the repository. The helper publishes questions and accepts the primary account's answers.
7. Review the account, repository and content in the preview, then execute.

The browser calls one resumable step at a time, waiting between steps. GitHub performs the actual branch, file, PR, merge and Discussion operations. The server checks the principal's identity and the repository's visibility and permission before each step. The workflow does not disable branch protections, delete branches or overwrite existing session files with different content. If a check, merge rule or API limit blocks a step, the app displays the error and preserves the last checkpoint for a manual resume.

Pull Shark defaults to two PRs, with a maximum of sixteen per run. YOLO and Pair run once. Galaxy runs one or two questions. A completed workflow verifies GitHub records; badge eligibility and eventual display remain under GitHub's control.

## Sessions and privacy

Raw access tokens stay encrypted inside API-issued bearer sessions. The browser stores those encrypted sessions for the primary and helper accounts in sessionStorage, along with the encrypted execution checkpoint, so a second OAuth redirect does not lose the first account. These bearer sessions are sensitive even though their contents are encrypted. They expire within one hour and are cleared by logout. No credential is stored in localStorage, a URL, the repository or build output.

The separate manual checklist uses localStorage key `bm.plan.v2` and is independent of login and inspected profiles. Session-file content, questions, responses and coauthor trailers become public in the selected repository after execution confirmation. The app does not automatically import, expose or delete previous member-directory records.

## Local validation

```sh
npm ci
npm test
npm run build
npm start
```

For local OAuth, set `FRONTEND_URL` and the OAuth App callback to the matching local address. For a Pages-only preview without OAuth, use `python3 -m http.server 8080 --directory dist`.

Tests cover OAuth state and PKCE, session integrity, attribution, two PR merges, open-only PRs, second-account Discussions, confirmed execution, private-repository rejection and interrupted-step recovery. Provider/API readiness can be checked without logging in. A real OAuth authorization and live activity run require the user to select and authorize their GitHub account.
