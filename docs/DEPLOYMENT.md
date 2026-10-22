# Deploy ChatSpark

## GitHub

Repository: [vishsena864-collab/RC](https://github.com/vishsena864-collab/RC). Only public source and non-secret assets belong here.

## Vercel

1. Create/connect a Next.js project from the GitHub repository and set Root Directory to `web`.
2. Set `NEXT_PUBLIC_SITE_NAME=ChatSpark` and `NEXT_PUBLIC_SITE_URL=https://chatspark-rc.vercel.app`.
3. Set `NEXT_PUBLIC_SERVER_URL` to the backend's HTTPS Railway service domain; redeploy after changing this variable because it is compiled into browser JavaScript.
4. Use the verified production domain `chatspark-rc.vercel.app`. The shorter `chatspark.vercel.app` belongs to another Vercel project/team.

## Railway

1. Create a private project and connect this GitHub repository. Set service Root Directory to `/server` for reliable monorepo detection.
2. Use `npm ci` as build/install and `npm start` to launch. Avoid setting an unused invalid health check path; configure a health endpoint that exists in the source.
3. Set `CORS_ORIGINS=https://chatspark-rc.vercel.app`, `TRUST_PROXY` only behind a trusted proxy, `ADULT_ENABLED=false`, and a strong non-committed `PRIVACY_HMAC_SECRET`.
4. Generate an HTTPS service domain and paste that into the frontend's `NEXT_PUBLIC_SERVER_URL`.
5. Run **one replica** until matchmaking state is shared across replicas.

## Supabase

Private tables are available in the connected Supabase project, but the current Socket.IO backend does **not** query them. Do not expose answer tables directly through the browser. Any future integration must use a server-side secret through the Railway environment.

## Verify before public launch

- Confirm the website renders on desktop and mobile, the frontend reaches backend health, and two anonymous clients match and exchange text.
- Test both clients receiving four identical clues, first-correct-wins scoring, and timeout handling.
- Confirm abuse reporting, blocks, CORS rejection, and automatic cleanup behave as expected.
- Do not claim untraceable connections or age verification based on an 18+ checkbox.
