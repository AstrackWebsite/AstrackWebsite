# ART Asbestos

Digital site-compliance platform for licensed asbestos removal (ART Asbestos Ltd).
Mobile-first web app that replaces on-site paper compliance records with
structured digital capture.

**v1 scope:** single-company, online-only. Offline sync, multi-tenant SaaS,
billing and the placeholder modules (Project Planner, Client Portal, Audits,
Incident/Fault reporting) come later.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** — mobile-first, deep-navy design system
- **Supabase** — Postgres + Auth (email/password) + Row-Level Security
- **@react-pdf/renderer** — closeout PDF pack (Phase E)
- Deploys to **Netlify**

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project**, then copy your keys into `.env.local`
   (never commit this file):

   ```bash
   cp .env.example .env.local
   ```

   Fill in from **Supabase → Project Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; used by the seed script)

3. **Apply the schema.** In the Supabase dashboard → **SQL Editor**, run, in order:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_rls.sql`

4. **Seed demo data + logins**

   ```bash
   npm run seed
   ```

   Creates ~12 staff (incl. an expired face-fit → visible cert-blocking),
   4 projects, plant, exposure records, and two demo logins:

   | Role | Email | Password |
   |------|-------|----------|
   | Management | `admin@artasbestos.co.uk` | `Passw0rd!Demo` |
   | Supervisor | `jpatel@artasbestos.co.uk` | `Passw0rd!Demo` |

5. **Run the app**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000 and sign in.

## Compliance logic (the point of the app)

Implemented in the schema + `src/lib/compliance.ts`:

1. **Cert-blocking** — expired medical / face-fit / mask-service blocks site sign-in.
2. **RLS** — site users capture; management approves/edits project data.
3. **Adaptive forms** — staff fields vary by role; project docs vary by classification.
4. **4-hour TWA** — exposure log computes the time-weighted average vs the 0.1 f/ml control limit.
5. **Licensed gate** — start-of-project plant checks required before day 1; daily thereafter.
6. **Closeout pack** — one PDF bundling the project's compliance record.
7. **Append-only evidence** — compliance rows are delete-/update-blocked (CAR 2012 Reg 19, 40-year retention).

## Build order

- **Phase A** ✅ — scaffold, schema + seed, auth, app shell, design tokens
- **Phase B** — Dashboard + Staff
- **Phase C** — Projects + Site Register (cert-blocking)
- **Phase D** — Daily Capture (exposure + TWA) + plant checks
- **Phase E** — Closeout + PDF pack
