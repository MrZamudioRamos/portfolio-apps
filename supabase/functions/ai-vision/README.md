# ai-vision Edge Function

Proxies plant-vision calls to Anthropic so the API key never ships in the app
bundle. Replaces the old client-side `EXPO_PUBLIC_ANTHROPIC_KEY` + direct
`api.anthropic.com` calls in `pestIdentify.ts` / `plantScan.ts`.

## Deploy

Requires the Supabase CLI logged in and the project linked
(`supabase login`, then `supabase link --project-ref <ref>`).

```bash
# from repo root (or wherever the supabase project is linked)
supabase functions deploy ai-vision --no-verify-jwt=false

# set the Anthropic key as a secret (NOT EXPO_PUBLIC_*)
supabase secrets set ANTHROPIC_KEY=sk-ant-xxxxx
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected automatically — don't set them.

### Or via the Dashboard
Edge Functions → Create function `ai-vision` → paste `index.ts` → Deploy.
Then Settings → Edge Functions → Secrets → add `ANTHROPIC_KEY`.

## Verify

After deploy, open the app (logged in, Pro), run a plant scan or pest
diagnosis. The client calls `functions.invoke('ai-vision', …)`; the function
authenticates the user, reads the secret, calls Claude, and returns parsed JSON.

A 401 means the user JWT wasn't sent (must be logged in). A 500 `NO_KEY` means
the `ANTHROPIC_KEY` secret isn't set.

## After deploy

Remove `EXPO_PUBLIC_ANTHROPIC_KEY` from `.env` / EAS secrets — it's no longer
referenced by any client code, so it won't be bundled, but delete it to avoid
confusion and accidental reintroduction.

## Future hardening

- Per-user rate limit (e.g. a `ai_usage` table keyed by user_id + day) to cap
  abuse and cost.
- Optional Pro check server-side once entitlement is queryable.
