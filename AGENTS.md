# ChatSpark coding and deployment instructions

Scope: the entire repository `vishsena864-collab/RC`.

## Protect deployment quota

- Vercel's free deployment quota was exhausted by 104 commits/deployments on 2026-10-31, many pushed one file at a time.
- **Never push or commit each file as a separate change.** Collect all edits; make **one atomic batch commit per task** using local Git or GitHub's create_tree + create_commit + update_ref API.
- Prefer a topic branch and **one merge to main after successful GitHub Actions**. Avoid repeated small fixes pushed to main. Check out and modify multiple files locally before committing.
- Production deploys are automatic on `main` only; `web/vercel.json` blocks automatic deployments from other branches. Vercel project setting also disables preview deployments. Do not silently reverse either.
- Only run a manual Vercel deployment after a user explicitly requests it and quota is available. Keep preview/prod environments distinct and verify the target SHA.
- GitHub Actions `frontend-build` and `backend-tests` can validate a PR without consuming Vercel preview deployments.
- Do not configure Vercel's Ignored Build Step as a quota solution; canceled builds still count toward deployment quotas.
- For docs or backend-only changes, combine them with a planned frontend release where possible, since main commits may still deploy.
- Never change live production/environment configurations, disable CI, commit secrets, or modify Railway/Supabase just to reduce deployment count.

See `CONTRIBUTING.md` for the standard release process.
