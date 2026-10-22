# ChatSpark architecture

## Frontend (Vercel)

The `web/` directory contains the Next.js App Router frontend, localized pages, CSS animations, chat UI, Movie Rush game UI, and prebuilt art. It connects to a real-time service over secure WebSockets; the client does not obtain peer IP addresses.

## Backend (Railway)

The `server/` directory runs one Node.js/Socket.IO server and handles matchmaking, topic filtering, chat relay, game lifecycle, guess validation, reports and rate limits. The bundled read-only SQLite movie question file is used by default.

## Database (Supabase, optional)

Supabase can hold private movie and moderation records for a later database-backed architecture. The current Socket.IO backend uses its bundled local SQLite game bank and locally persisted moderation state; deploying Supabase tables does **not** make this backend use Supabase automatically.

## Privacy model

Network peers do not exchange direct connections. The operator/hosting infrastructure can receive IP metadata; abusive peers can still disclose things in messages. Restrict `CORS_ORIGINS` to the real website and keep IP-derived HMAC secrets out of source control.

## Production limitations

The in-memory matchmaking queue only works reliably with one backend instance. Run one Railway replica until a shared matchmaker is implemented. Local moderation/SQLite state should be moved to durable protected storage before depending on multi-instance deployments.
