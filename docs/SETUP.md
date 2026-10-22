# Deployment and OAuth setup

## Production architecture

The frontend is published at https://brunnojob.github.io/BadgeMasterfree/ by GitHub Actions. The API runs at https://badgemasterfree-api.vercel.app/api/gateway in the Vercel project `badgemasterfree-api` on Node.js 24. Community profiles use Neon Postgres through `DATABASE_URL`. Local development can use SQLite. Fly.io configuration has been removed from the repository.

## Vercel project

Connect `brunnojob/BadgeMasterfree` to the existing `badgemasterfree-api` project in `brunnojobs-projects`, with production branch `main`, framework Other, build command `npm run build`, install command `npm ci`, output directory `dist` and Node.js 24. The `vercel.json` file configures the gateway function. Each push deploys the API separately from GitHub Pages.

Production needs a publicly reachable API domain. Keep previews protected if desired; production must accept requests from visitors to the public Pages frontend. CORS only accepts the configured frontend origin. Public API reachability does not remove OAuth/session validation on authenticated routes.

Configure these variables in the Vercel project's production environment, never in GitHub Pages or source code:

| Variable | Purpose |
| --- | --- |
| `GITHUB_CLIENT_ID` | Existing GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | Existing OAuth App secret; store as sensitive |
| `SESSION_SECRET` | Random value of at least 32 characters; store as sensitive |
| `FRONTEND_URL` | `https://brunnojob.github.io/BadgeMasterfree/` |
| `DATABASE_URL` | Neon Postgres connection string; store as sensitive |

Redeploy after changing environment variables. The frontend's `web/config.js` must point to the verified production URL ending in `/api/gateway`.

## GitHub OAuth App

Keep the homepage and authorization callback exactly `https://brunnojob.github.io/BadgeMasterfree/`. Moving the backend does not change this callback: the frontend receives the code and sends it to the new API with the encrypted PKCE flow. Do not configure the Vercel backend as the OAuth callback.

The backend uses `read:user`, `public_repo` and `user:follow`. GitHub OAuth's `public_repo` permission is broader than starring alone. Sessions are encrypted, expire after at most one hour and stay only in page memory. No GitHub tokens are stored in localStorage, sessionStorage, URLs or the profile database. sessionStorage holds only the ten-minute OAuth state and encrypted flow.

The existing Fly secrets do not transfer automatically. Enter the OAuth App's credentials directly in Vercel; do not paste them into issues, chat or files. If you no longer have the client secret, manage it in GitHub Settings → Developer settings → OAuth Apps, then enter it in Vercel.

## Persistent profiles

In the Vercel project open Storage, connect a Neon Postgres database and expose its `DATABASE_URL` to Production. Review the provider's plan and terms before creating the resource. Do not reuse an unrelated application's database.

The API lazily creates `badgemaster_members` on the first community operation. The configured database role therefore needs table-creation permission for initial setup. The table stores verified GitHub numeric IDs, logins, opt-in profiles, visibility and update timestamps. Parameterized queries handle reads, upserts, searches and deletion. Directory pages contain at most 24 visible members.

Vercel explicitly rejects the local SQLite adapter, including `/tmp` paths, because these do not persist across instances or deployments. When `DATABASE_URL` is missing, OAuth can still work while community operations return an explicit 503. The `status` response reports configured variable names and `communityReady`; it does not test database connectivity.

There is no automatic import of a prior SQLite database. If an older deployment contains member records, back it up and import verified records before enabling community writes. The failed Fly deployment did not establish a persistent volume.

## Diagnostics

Open the configured gateway with `?action=status`. A successful deployment returns JSON with `platform: "vercel"`. Login requires `ready: true` and an empty `missing` array. Profiles additionally require `communityReady: true` and a reachable database. Status never includes secret values.

If the API returns a Vercel authentication page instead of JSON, check the production deployment protection settings. If it returns 503 with `OAUTH_NOT_CONFIGURED`, fill the named variables and redeploy.

## Local development and validation

```sh
npm ci
npm test
npm run build
npm start
```

Use Node.js 24. Copy `.env.example` to `.env`. Leave `DATABASE_URL` empty to use `COMMUNITY_DB_PATH=./data/community.sqlite` locally. To test Postgres, configure a dedicated development Neon database. Never point local tests at the production member database.

Tests cover SQLite persistence, profile validation, visibility and pagination, OAuth state/PKCE, session integrity, project ownership, parameterized Postgres operations and refusal of ephemeral storage on Vercel. Complete a real OAuth login and profile round-trip after the production variables are configured.

## GitHub Pages

In Settings → Pages, choose GitHub Actions. `Publish BadgeMasterfree` installs the locked dependencies, tests, builds `web/` into `dist/` and deploys the frontend. Secrets and the server implementation are not copied into `dist/`.

## User actions

Creating a GitHub account opens the official `https://github.com/signup` page. BadgeMasterfree neither collects GitHub passwords nor creates independent password accounts. Community profiles belong to the identity returned by GitHub OAuth. Repository ownership and visibility are checked before highlighting projects. Stars and follows still require an individual confirmation; browsing does not perform them.
