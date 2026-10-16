# Deployment and OAuth setup

## Public page

Expected GitHub Pages URL: https://brunnojob.github.io/BadgeMasterfree/

In repository Settings → Pages, select **GitHub Actions** as the source. The `Publish BadgeMasterfree` workflow builds `web/` into `dist/` and deploys it. If automatic Pages enablement is denied, enable Pages in Settings and rerun the workflow. In the repository About editor, set the Website field to the URL above.

## OAuth App

Use these exact values:

- Homepage URL: `https://brunnojob.github.io/BadgeMasterfree/`
- Authorization callback / Redirect URI: `https://brunnojob.github.io/BadgeMasterfree/`
- Disable wildcard matching; the callback is an exact URL.
- Device Flow is not used.
- Expiring tokens are supported; the application session expires after at most one hour. Reauthenticate afterward. Refresh tokens are not retained.

The callback is processed by `web/app.js`: it validates the browser state, clears the URL, and sends the short-lived code and encrypted PKCE flow to the backend. The client secret must never be placed in GitHub Pages, source files, README, frontend config or chat.

## Vercel backend

Deploy this repository as a Vercel project using `vercel.json`. The `/api/gateway` function handles OAuth and authenticated REST API actions. Configure the production environment variables in the Vercel dashboard:

- `GITHUB_CLIENT_ID`: the OAuth App client ID (public identifier).
- `GITHUB_CLIENT_SECRET`: the OAuth App secret, stored as a sensitive variable.
- `SESSION_SECRET`: a random secret of at least 32 characters; generate locally with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` and store as sensitive.
- `FRONTEND_URL`: `https://brunnojob.github.io/BadgeMasterfree/`.

Redeploy after changing environment variables. Set `web/config.js` to the verified production gateway URL (ending in `/api/gateway`). The checked-in gateway points to Fly.io; change it only when moving to another verified backend. Frontend and backend communicate using CORS restricted to the Pages origin and encrypted, short-lived bearer sessions held only in page memory. There are no GitHub tokens in localStorage, sessionStorage or URLs. sessionStorage contains only the ten-minute encrypted OAuth flow and state.

The app uses OAuth scopes `read:user`, `public_repo`, `user:follow`. GitHub OAuth's `public_repo` scope is broader than starring alone; the consent screen explains this. The backend exposes only the implemented profile, match, star and follow routes. An OAuth App is not a GitHub App with fine-grained permissions.

## Behavior

- Public discovery uses GitHub REST search. Public API limits apply; results are real, not simulated.
- Repository stars and user follows require a separate confirmation. Existing actions are detected before writing.
- A match is a mutual follow already present on GitHub, not an internal like or mandatory exchange.
- Matches compare up to 1,000 followers and 1,000 followed users; larger accounts see a partial-results notice.
- Browsing never performs stars or follows. There are no automatic exchanges, guaranteed achievements, fake accounts, or bulk actions.
- Logout clears this page's session. Revoking the OAuth grant is available in GitHub Settings → Applications.
- Configuration and upstream errors are shown explicitly. Login is unavailable until all OAuth variables exist.

## Checks

Run `npm test` and `npm run build` with Node.js 22 or newer. Tests cover encrypted-session integrity, expiry, PKCE, route validation, missing configuration and origin restrictions. An actual third-party OAuth login must be tested after configuring the OAuth app and backend secrets.

## Fly.io deployment

The repository includes a multi-stage `Dockerfile`, a Node.js HTTP entrypoint and `fly.toml` for the existing `badgemasterfree` app. Deploy the latest `main` commit from the Fly dashboard (not a retry pinned to an older commit), or run `fly deploy --app badgemasterfree` from this checkout.

The service listens on `0.0.0.0:8080`, serves the built frontend, and exposes `/api/gateway` plus `/healthz`. The frontend on GitHub Pages calls `https://badgemasterfree.fly.dev/api/gateway`.

In Fly Secrets, configure `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` and `SESSION_SECRET` (a random value of at least 32 characters). `FRONTEND_URL` is already set to the GitHub Pages URL in `fly.toml`; keep the OAuth homepage and callback set to that exact Pages URL. OAuth remains unavailable until secrets are configured. No secret is needed to build the Docker image or pass the health check.

Local smoke test: `npm run build` followed by `npm start`. Container test: `docker build -t badgemasterfree .` followed by `docker run --rm -p 8080:8080 badgemasterfree`.

## Diagnose the current login failure

Open `https://badgemasterfree.fly.dev/api/gateway?action=status`. Login works only when `ready` is `true`. The `missing` list reports variable names only, never secret values. A GitHub Pages deployment cannot configure or redeploy the Fly.io backend.

In the existing `badgemasterfree` Fly app, add the OAuth App credentials as Secrets under the exact names `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`, plus a random `SESSION_SECRET` of at least 32 characters. Apply the secrets and deploy this repository's latest commit. Keep the OAuth callback exactly `https://brunnojob.github.io/BadgeMasterfree/`. Do not paste secrets into the repository or the frontend.

For local development, copy `.env.example` to `.env`, fill in the values, build, and run `npm start`; the start script loads `.env`.

## Community registration and project profiles

Registration uses the authenticated GitHub identity, not a separate password. Both **Criar cadastro** and **Entrar** use OAuth; first-time visitors complete a profile after authentication. Existing members edit the same record, identified by the immutable numeric GitHub ID. Public listing is opt-in. Members can save a name, bio, skills, collaboration availability and up to six public repositories owned by their GitHub account. The gateway verifies repository ownership and visibility on each save. Members can hide or delete their profile without changing their GitHub account. Public project links and profile links support networking; existing follows still require individual confirmation.

Profiles are stored server-side in SQLite using Node.js >=22.13, not browser storage. No email, password, OAuth token or session is written to the community database. Directory search is public and paginated (24 results per page). Registration and edits require a valid OAuth session. `status` includes `communityReady` to indicate whether a database path is configured; health checks do not verify disk availability.

For the existing Fly.io backend, provision and mount persistent storage **before enabling registrations**:

```sh
fly volumes create community_data --region gru --size 1 --app badgemasterfree
fly scale count 1 --app badgemasterfree
fly deploy --app badgemasterfree --ha=false
```

The checked-in `fly.toml` mounts `community_data` at `/data` and configures `COMMUNITY_DB_PATH=/data/community.sqlite`. The container fixes the mount directory ownership before dropping to the unprivileged Node user. Use a single Fly machine with this SQLite store; volumes are local and independent copies do not synchronize. Configure volume snapshots/backups for member data. Do not set this path to temporary storage on a serverless host. The Vercel gateway requires replacing this persistence adapter with a shared durable database before community registration is enabled there.

For local development use `COMMUNITY_DB_PATH=./data/community.sqlite` from `.env.example`. The directory and schema are created automatically. SQLite files are excluded from git and the frontend build. If `COMMUNITY_DB_PATH` is absent, login and discovery remain available while community endpoints return an explicit 503. GitHub Pages deploys only the frontend: deploy the updated Fly backend as well, otherwise the new community routes will be unavailable.

Run `npm test` for persistence across restart, profile validation, visibility, pagination, deletion, authentication and repository ownership checks, then `npm run build`. Complete a real OAuth login after deployment to verify the configured credentials and volume.

## GitHub account creation

The authentication screen's **Criar conta** flow links to `https://github.com/signup` in a separate tab. Users create their actual GitHub account there, return to BadgeMasterfree, and select **Conectar GitHub** for OAuth. BadgeMasterfree does not collect GitHub passwords or create independent password accounts. Its community profile is an application-specific record associated with the verified GitHub numeric identity.
