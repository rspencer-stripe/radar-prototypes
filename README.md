# Radar design

Internal directory of prototypes, strategy docs, and resources for the Stripe Radar design team. A static front end (`index.html` / `app.js` / `styles.css`) backed by Vercel serverless functions (`api/`) and Vercel Postgres (`lib/db.js`).

Live at `go/radar/design`.

## Forking for your own team

This project is built so any team can fork it, deploy their own copy, and still pull in upstream improvements later.

1. **Fork on GitHub** — use the "Fork" button (not a manual clone + new repo). That keeps the upstream link so you can sync in updates via GitHub's "Sync fork" or by opening a PR from `upstream/master`.
2. **Create a new Vercel project** from your fork.
3. **Add Postgres storage** — in the Vercel project, add a Postgres (Neon) storage integration. Vercel auto-populates all the `POSTGRES_*` / `DATABASE_URL` env vars the app needs (see `lib/db.js`, which reads via `@vercel/postgres`). No manual env var setup required.
4. **Deploy** (`vercel --prod` or just push to `master` if you've connected the GitHub integration). The app creates its own tables (`prototypes`, `app_settings`) on first request — no migration step needed.
5. **Customize for your team** — authors, tags, and author photos are all configured live from the settings gear in the UI (persisted to your Postgres instance), not hardcoded. You shouldn't need to touch the code to make this "yours."

### Pulling in upstream updates

Because your copy is a real GitHub fork, you can periodically sync:

```
git fetch upstream
git merge upstream/master
```

(or use GitHub's "Sync fork" button). Since team-specific config lives in your database rather than in code, merges should stay clean even as the shared template evolves.

### Contributing back

If you build something worth sharing with other teams using this template, open a PR against the upstream repo.

## Local development

```
vercel dev
```

Requires a `.env.local` with the Postgres env vars (pull them with `vercel env pull .env.local` after linking the project).

## Stack

- Static HTML/CSS/vanilla JS front end, no build step
- Vercel serverless functions in `api/`
- Vercel Postgres (Neon) via `@vercel/postgres`
- Screenshots captured via microlink.io (`api/scrape.js`)
