# BadgeMasterfree

GitHub achievement automation by [brunnojob](https://github.com/brunnojob).

[Open the app](https://brunnojob.github.io/BadgeMasterfree/) · [Deployment and OAuth setup](docs/SETUP.md)

Sign in with the GitHub account that should receive activity credit, select a public repository and execute an authenticated workflow. The interface keeps the project's charcoal and lime identity and groups achievements, project discovery and developer discovery in one app.

## Automated workflows

| Workflow | Operations |
| --- | --- |
| Pull Shark | Create branches, commit session files, open PRs, optionally merge and verify each merge. Default: two PRs; up to sixteen per run. |
| YOLO | Create and merge one PR without requesting review; repository protections still apply. |
| Pair Extraordinaire | Create a commit with a confirmed collaborator's `Co-authored-by` trailer, open its PR and optionally merge it. |
| Galaxy Brain | A separately authenticated helper account creates a question, the primary account posts the answer, and the helper accepts it. The API verifies the accepted answer's author. One or two discussions per run. |

Before execution, review the authenticated account, destination, quantity, merge setting and exact content. Each PR adds a Markdown session file under `badgemaster/sessions/`; it does not overwrite application files. Use an existing public repository with push access or explicitly create the public `badgemaster-lab` repository from the app.

Execution displays actual GitHub links and statuses. Pause stops subsequent steps after the current request. Resume continues from an encrypted, account-bound checkpoint. Completed GitHub records remain when a run is stopped. Interrupted branch, file and PR steps recover existing records before creating replacements. The app respects repository checks, merge rules and API limits.

GitHub controls badge eligibility and display. A successful workflow confirms the activities recorded by GitHub, not that a badge has been awarded. Coauthor emails must be associated with the collaborator's GitHub account; when omitted, the app derives their GitHub noreply address. Galaxy Brain requires two different accounts and Discussions enabled with an answerable Q&A category.

## Authentication and hosting

The frontend is hosted on GitHub Pages. OAuth code exchange and authenticated operations run through the existing Vercel API. GitHub client secrets and raw access tokens are never included in the Pages build. Login uses state, PKCE and GitHub's account picker. API sessions and execution checkpoints are encrypted and expire within one hour. This tab stores encrypted bearer sessions in sessionStorage to preserve both identities across account-selection redirects; logout removes them. No personal access token needs to be pasted into the app.

The OAuth scopes are `read:user`, `public_repo` and `user:follow`. `public_repo` grants broad access to public repositories. The automation service accepts specific operations rather than arbitrary API destinations, checks repository visibility and push permission, and binds each execution to its authenticated account.

The original member-directory backend remains available separately. It is not needed for badge automation. Existing member records have not been moved or deleted.

## Additional tools

Public profile analysis, project and developer search, contribution guides, a browser-local checklist, Markdown plan export and a standalone coauthor trailer generator remain available. The checklist is personal guidance and does not verify awarded badges.

## Development

Use Node.js 24:

```sh
npm ci
npm test
npm run build
npm start
```

For a static preview, run `python3 -m http.server 8080 --directory dist`. Configure `.env` for local OAuth/backend testing; see [SETUP.md](docs/SETUP.md). Pushes to `main` test, build and publish the Pages frontend. Vercel publishes the API from the same repository.

## Credits and license

Maintained by [brunnojob](https://github.com/brunnojob) · [brunnodev.store](https://brunnodev.store). GitHubCrazy inspired the requested workflow; the implementation and interface are original. Existing artwork and its history are retained in `Media/`; GitHub achievement names and images belong to their respective owners. See [LICENSE](LICENSE).
