# Contributing to ChatSpark ✳

We welcome improvements to accessibility, animations, privacy, moderation, localization, and Movie Rush.

1. Create a feature branch; avoid committing `.env`, service keys, log files, or user-generated chat content.
2. Install Node.js 22.16+ (24 recommended), then run `npm ci` separately in `server/` and `web/`.
3. Run `cd server && npm test` and `cd web && npm run build` before submitting changes.
4. Keep translations consistent across `web/lib/dictionaries/`.
5. Respect `prefers-reduced-motion`; animations must be optional for accessibility.
6. Changes to guessing logic, reports, identity or moderation must include tests and a threat-model note.

Never enable video or WebRTC without a separate, deliberate privacy review.

## Deployment budget / Git workflow

**Vercel preview builds are disabled** on the `randomchat` project. In
`web/vercel.json`, automatic Git deployments are permitted for **`main`
only**. Work on feature branches and merge the final tested changes once.

1. Build and test changes locally (or in GitHub Actions) **before pushing**.
   Collect all related file edits into one commit/push per complete task.
   When using a GitHub API agent, submit a single atomic Git tree + commit
   rather than one Contents API commit per file.
2. Use a feature branch + pull request; review successful `frontend-build`
   and `backend-tests` checks. Merge **once** after the feature is ready.
   Each update to `main` can create a Vercel production deployment.
3. Do **not** create documentation-only commits directly on `main`; batch
   docs with the next actual website release when possible. Changes to
   backend-only or documentation files still trigger the `main` Git
   deployment in the current configuration.
4. To test a UI preview, explicitly arrange an intentional manual preview
   deployment after checking the Vercel quota; automatic previews stay off.
   Never turn on automatic previews for ongoing file-by-file development.
5. Do **not** use an *Ignored Build Step* to manage the deployment **count**:
   Vercel counts canceled builds initiated by that step toward deployment
   quotas. Such a step can save build execution time but not quota.
6. `web/` and `server/` are separate npm projects, not a declared
   workspace monorepo. Do not enable affected-workspace deployment skipping
   without first defining and testing workspace dependency boundaries.
7. Check Vercel deployment count before forcing a manual redeploy. If a
   deployment limit is reached, keep CI green, preserve the last working
   production deployment, and retry one deliberate release once allowed.

The `web/vercel.json` Git restriction controls automatic Git-triggered
deployments, **not** manually triggered deployments. Vercel project setting
`previewDeploymentsDisabled=true` is an additional guard; reverting to
automatic preview builds requires an explicit decision to change both layers.

Official documentation:
- https://vercel.com/docs/project-configuration/git-configuration
- https://vercel.com/docs/project-configuration/project-settings
- https://vercel.com/docs/monorepos
