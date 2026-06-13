# Supabase provisioning (do this first)

This project uses:

- **Supabase Auth** in the Next.js frontend (browser session).
- **NestJS API** validates the browser’s Supabase access token using `SUPABASE_JWT_SECRET`.
- **Supabase Postgres** as the database (via `DATABASE_URL`).
- Optional: **Supabase Storage** for organization logos (signed uploads from API).

## 1) Create the Supabase project

1. Go to Supabase dashboard and create a new project.
2. Choose a strong database password and region close to you.
3. Wait until the project finishes provisioning.

## 2) Enable Auth (Email/Password)

1. Open: **Authentication → Providers**.
2. Enable **Email** provider.
3. For local testing, keep “Confirm email” disabled (optional), or use a real SMTP later.

You can now sign up from the app at `/login` (email/password).

## 3) Get the values you must copy into env files

Open **Project Settings → API**:

- Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` (web)
- Copy **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (web)
- Copy **JWT Secret** → `SUPABASE_JWT_SECRET` (api)

Open **Project Settings → Database**:

- Copy **Connection string** (URI) → `DATABASE_URL` (api)

Notes:

- Use the same Supabase project for local + production until you want separate environments.
- If your host requires SSL, add `?sslmode=require` to `DATABASE_URL` (Supabase commonly does).

## 4) (Required) Generate encryption key for storing sensitive org fields

The API encrypts GSTIN / bank account / IFSC at rest using AES-256-GCM.

Generate a 32-byte random key (base64) and set it as `FIELD_ENCRYPTION_KEY` in `apps/api/.env`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Keep it secret. If you lose this key, you will not be able to decrypt existing encrypted fields.

## 5) (Optional) Configure Storage bucket for logos

If you want the API to generate signed upload URLs:

1. Open: **Storage → Buckets**.
2. Create a bucket named `org-logos` (or use a different name and set `SUPABASE_LOGO_BUCKET` on the API).
3. Open: **Project Settings → API** and copy the **service_role key**.
4. Set these env vars on the API only:
   - `SUPABASE_URL` (same as project URL)
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_LOGO_BUCKET=org-logos`

If you skip this, you can still paste a public logo URL in organization settings.

Run migrations against the same database:

```bash
npm install
npm run db:deploy
```

For local development you can use `npm run db:push` from the repository root if you prefer schema sync without migration history.

## Supabase Auth notes (important)

- If you use **Email/Password** locally, make sure the Email provider is enabled and you create a user in the Supabase Auth UI or through your app signup flow.
- For production you may also enable OAuth providers later; the API only cares about validating the Supabase JWT.
