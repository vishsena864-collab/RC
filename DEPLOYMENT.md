# RandomChat deployment

## Source upload

The full source is packaged as `randomchat_animated_345_questions.zip` in the ChatGPT conversation. Extract it, then commit the extracted files to this repository. Never commit `.env` files or credentials.

## Vercel

Use the `web` root directory for the Next.js frontend. Configure the public backend URL after Railway deployment.

## Railway

Deploy the same GitHub repository using the repository-root `railway.json` settings. Set allowed frontend origin to your deployed Vercel URL.

## Supabase

The `randomchat_private.movie_questions` and `randomchat_private.abuse_reports` tables exist in the connected project. Keep game answers server-side; never expose service-role credentials in browser code.

## Notes

The desired `randomchat.vercel.app` domain is currently assigned to another Vercel project/team, so it cannot yet be attached to the new project.
