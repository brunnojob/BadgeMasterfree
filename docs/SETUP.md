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

Redeploy after changing environment variables. Set `web/config.js` to the verified production gateway URL (ending in `/api/gateway`). Its empty default intentionally disables login until the backend is deployed. Frontend and backend communicate using CORS restricted to the Pages origin and encrypted, short-lived bearer sessions held only in page memory. There are no GitHub tokens in localStorage, sessionStorage or URLs. sessionStorage contains only the ten-minute encrypted OAuth flow and state.

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
