# Billing Software

A full-stack, monorepo-based billing and invoicing platform. It enables users to create and manage organizations, parties (clients), and invoices. Sensitive organization fields (like GSTIN, bank account, and IFSC) are encrypted at the application layer before persisting to the database.

## 🌟 What it Currently Does

This project is a comprehensive invoicing solution designed with security and multitenancy in mind. The current features include:

- **Monorepo Architecture**: Structured with Turborepo, containing a Next.js frontend and a NestJS backend.
- **Authentication**: Powered by Supabase Auth (Email/Password).
- **Organization Management**: Users can create organizations, manage organization details (like bank info, GSTIN, terms, invoice prefixes), and upload logos securely via signed URLs.
- **Party (Client) Management**: Organizations can manage their clients (Parties), including details like GSTIN, address, and state code for GST calculations.
- **Invoice Generation**: 
  - Supports `BILL_OF_SUPPLY` and `TAX_INVOICE` document types.
  - Maintains sequential auto-incrementing invoice numbers per organization.
  - Snapshotting of seller details at the time of invoice creation.
  - Granular line-items support with HSN/SAC codes, quantities, rates, and automated CGST/SGST/IGST tax calculation based on state codes.
  - Invoice status tracking (`DRAFT` vs `ISSUED`).
- **Data Security**: Utilizes AES-256-GCM field encryption at rest for sensitive organization data (GSTIN, Bank Accounts, IFSC).
- **PDF Export**: Relies on a zero-dependency, native browser Print dialog to save invoices as PDFs.

## 🛠 Tech Stack

- **Frontend (`apps/web`)**: Next.js 15, React 19, Supabase SSR
- **Backend (`apps/api`)**: NestJS 10, Prisma ORM
- **Database**: PostgreSQL (hosted via Supabase)
- **Tooling**: Turborepo, TypeScript, Jest (API tests), Playwright (Web E2E tests)

---

## 📡 API Endpoints

The NestJS backend (`@billing/api`) exposes the following RESTful endpoints. All endpoints (except `/health`) require a valid Supabase JWT Bearer token. Many endpoints also require the user to be a member of the specific organization (`OrgMemberGuard`).

### Health
- `GET /health` - Check API health status.

### Organizations (`/organizations`)
- `GET /` - List all organizations the current user belongs to.
- `POST /` - Create a new organization and assign the user as `OWNER`.
- `GET /:orgId` - Get details of a specific organization.
- `PATCH /:orgId` - Update an organization's details (e.g., bank info, terms, prefix).
- `POST /:orgId/logo/signed-upload` - Generate a Supabase signed URL for secure logo upload.

### Parties (`/organizations/:orgId/parties`)
- `GET /` - List all parties (clients) for a specific organization.
- `POST /` - Create a new party.
- `GET /:partyId` - Get details of a specific party.
- `PATCH /:partyId` - Update a party's details.
- `DELETE /:partyId` - Delete a party.

### Invoices (`/organizations/:orgId/invoices`)
- `GET /` - List all invoices for a specific organization.
- `POST /` - Create a new invoice (draft) with line items.
- `GET /:invoiceId` - Get details of a specific invoice.
- `PATCH /:invoiceId` - Update a draft invoice (including line items recalculation).
- `POST /:invoiceId/issue` - Mark an invoice as `ISSUED`.

---

## 💻 Developer Setup

### Prerequisites

- Node.js 20+
- npm 9+ (ships with Node)
- A Supabase project
- Vercel account (for frontend deployment)
- Render or Railway account (for backend API deployment)

### 1. Supabase Setup

1. Create your Supabase project.
2. Enable Auth provider (Email/Password) and create a test user if needed.
3. Keep your Supabase URL, Anon Key, and JWT Secret handy.

### 2. Environment Variables

Copy the example environment files and fill in the values:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

#### API (`apps/api/.env`)
- `DATABASE_URL`: Supabase Postgres connection string (Transaction mode recommended).
- `PORT`: API port (default `4000`).
- `CORS_ORIGIN`: Comma-separated origins (e.g. `http://localhost:3000,https://your-domain.vercel.app`).
- `FIELD_ENCRYPTION_KEY`: **Required**. A 32-byte base64-encoded random key. Run `node scripts/generate-field-encryption-key.mjs` to generate one.
- `SUPABASE_JWT_SECRET`: **Required**. Supabase "JWT Secret".
- `SUPABASE_URL`: (Optional) Required only for signed logo upload URLs.
- `SUPABASE_SERVICE_ROLE_KEY`: (Optional) Required only for signed logo uploads. **Never expose this to the frontend**.
- `SUPABASE_LOGO_BUCKET`: (Optional) Defaults to `org-logos`.

#### Web (`apps/web/.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key.
- `NEXT_PUBLIC_API_URL`: Base URL of your API (e.g., `http://localhost:4000`).

### 3. Installation & Database Migration

Install all workspace dependencies:

```bash
npm install
```

Run database migrations to create the necessary tables in your Supabase Postgres database:

```bash
npm run db:deploy
```
*(This uses the `DATABASE_URL` from `apps/api/.env`)*

### 4. Running the Development Servers

You can start both the Next.js frontend and the NestJS API concurrently using Turbo:

```bash
npm run dev
```

Alternatively, you can run them in separate terminals:
- **API**: `npm run dev -w @billing/api` (runs on `http://localhost:4000`)
- **Web**: `npm run dev -w @billing/web` (runs on `http://localhost:3000`)

---

## 🧪 Testing

- **API Unit Tests**: 
  ```bash
  npm run test -w @billing/api
  ```
- **Web E2E Tests (Playwright)**:
  ```bash
  npm run test:e2e -w @billing/web
  ```
  *(Starts Next.js on port 3000. Optionally set `E2E_API_URL=http://localhost:4000` to assert against the API `/health` endpoint)*

---

## 🚀 Deployment

### API Backend (Render / Railway)
NestJS is best suited for long-lived environments rather than serverless functions (to avoid cold starts).
1. Create a Web Service from the repository root.
2. Build command: `npm ci && npm run build -w @billing/api`
3. Start command: `npm run start:prod -w @billing/api`
4. Set the necessary environment variables (`DATABASE_URL`, `FIELD_ENCRYPTION_KEY`, `SUPABASE_JWT_SECRET`, `CORS_ORIGIN`, etc.).

### Web Frontend (Vercel)
1. Import the repository and set the **Root Directory** to `apps/web`.
2. Vercel will automatically detect the Next.js framework preset.
3. Add the `NEXT_PUBLIC_*` environment variables in the project settings.
