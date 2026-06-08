# HERA Arquiteto — Deploy Checklist

Run every item before shipping a release to production.

---

## 1. Supabase

### Migrations
- [ ] All migrations in `supabase/migrations/` applied in order (`supabase db push` or Supabase Dashboard > SQL Editor)
- [ ] Verify tables exist: `operations`, `phase_events`, `blueprints`, `competitors`, `intel_events`, `content_items`, `comparison_reports`, `workspaces`, `workspace_members`, `method_profiles`, `operation_metrics`
- [ ] `fn_append_phase_log` function exists (migration `20260609000000`)
- [ ] `intel_scan_hours` column exists on `operations` (migration `20260609010000`)

### RLS
- [ ] RLS enabled on every table (check: `select tablename, rowsecurity from pg_tables where schemaname='public'` → all must be `t`)
- [ ] Anon key cannot read data without a valid session (test in browser devtools with no auth)
- [ ] Service role key is **never** in any frontend file or VITE_ variable

### Realtime
- [ ] Publication `supabase_realtime` includes: `operations`, `phase_events`, `blueprints`, `competitors`, `content_items`, `intel_events`
  ```sql
  select * from pg_publication_tables where pubname='supabase_realtime';
  ```
- [ ] Row-level Realtime filters work (test in the BoardView pipeline live-update)

### Auth
- [ ] Email auth enabled in Supabase Auth settings
- [ ] Redirect URLs include `https://tracking.digitalhera.com.br/**` (no trailing slash-only entry)
- [ ] hera DG seed user exists (workspace + workspace_member row)

---

## 2. Frontend (Vercel)

### Environment variables on Vercel
```
VITE_SUPABASE_URL         = https://bajoplmsargtjlfnelln.supabase.co
VITE_SUPABASE_ANON_KEY    = (anon public key — safe to expose)
```
No other env vars in the frontend. `ANTHROPIC_API_KEY` must **never** appear here.

### Build
- [ ] `npm run build -w apps/web` exits clean (0 errors)
- [ ] `npm run typecheck -ws` exits clean
- [ ] No `console.error` in production build for missing env (check ConfigError guard in `main.tsx`)
- [ ] Fonts (Cormorant Garamond, Inter Tight) loading from Google Fonts — check `index.html`
- [ ] `vercel --prod` or automatic deploy from main branch

### Smoke tests (browser)
- [ ] `/auth` → login flow works, redirects to `/`
- [ ] Dashboard loads operations list
- [ ] Open an operation → BoardView pipeline shows phases
- [ ] Blueprint tab → section accordion works, Exportar PDF and Exportar Markdown work
- [ ] Inteligência tab → badge disappears after visit
- [ ] Mobile (< 768px) → hamburger visible, sidebar opens/closes, closes on nav tap

---

## 3. Worker (Railway / Contabo VPS)

### Environment variables
```
ANTHROPIC_API_KEY             = sk-ant-...
PERPLEXITY_API_KEY            = pplx-...
PERPLEXITY_MODEL              = sonar-pro
SUPABASE_URL                  = https://bajoplmsargtjlfnelln.supabase.co
SUPABASE_SERVICE_ROLE_KEY     = (service_role key — keep secret)
POLL_INTERVAL_MS              = 5000
INTEL_AUTO_SCAN_HOURS         = 0          # global fallback; per-op config via UI
LLM_PROVIDER                  = hybrid     # not actively used but must be valid
META_GRAPH_VERSION            = v21.0
# Optional Meta Premium:
HERA_PREMIUM_SUPABASE_URL     =
HERA_PREMIUM_SERVICE_ROLE_KEY =
HERA_PREMIUM_CLIENT_ID        =
```

### Deploy
- [ ] `npm run build -w apps/worker` exits clean
- [ ] Worker process starts: `node apps/worker/dist/index.js`
- [ ] Logs show `[worker] HERA Arquiteto worker iniciado` and poll loop message
- [ ] Queue a test operation from the UI → worker picks it up within `POLL_INTERVAL_MS`
- [ ] Operation reaches `status=done` without error

### Health checks
- [ ] Stale-job recovery fires on startup (`recoverStaleJobs`)
- [ ] After a 20-min job completes, `cost_usd` is populated in the DB
- [ ] Worker stays alive across multiple polls (no crash loop)

---

## 4. Security checklist

- [ ] `ANTHROPIC_API_KEY` not in git history (`git log -S ANTHROPIC` → no matches)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` not in any frontend file
- [ ] `apps/worker/.env` is in `.gitignore`
- [ ] No secrets in URL query strings anywhere
- [ ] RLS verified — anon users cannot read another workspace's data
- [ ] Compliance odonto: generated copy does not promise guaranteed clinical outcomes (test with a full BOM run)

---

## 5. Post-deploy verification

- [ ] Run a full BOM generation end-to-end (Briefing → queued → running → done → Blueprint rendered)
- [ ] Intel scan manual trigger works
- [ ] Auto-scan config saves and worker respects the interval
- [ ] Blueprint PDF export produces a readable A4 document
- [ ] Blueprint Markdown export downloads a `.md` file with all 7 sections
- [ ] Error boundary fires gracefully when a view crashes (test by temporarily throwing in a component)
- [ ] Mobile UX tested on a real device or Chrome DevTools mobile simulation
