# Seva Portal

A full-stack service-management platform: a public portal where customers browse and order services, plus a role-based admin dashboard (Superadmin + Subadmin) to manage services, orders, documents, and payments — with real-time order notifications.

**Stack:** React (Vite) + Tailwind · Node.js/Express · PostgreSQL + Prisma · Socket.IO · JWT auth

No Docker required — everything runs with a local PostgreSQL install and `npm`.

---

## 1. Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ installed locally

### Installing PostgreSQL without Docker

**Windows:** Download the installer from https://www.postgresql.org/download/windows/ and run it. Remember the password you set for the `postgres` user during setup.

**macOS:** `brew install postgresql@16` then `brew services start postgresql@16`

**Linux (Debian/Ubuntu):** `sudo apt update && sudo apt install postgresql postgresql-contrib` then `sudo systemctl start postgresql`

Once installed, create the database:
```bash
psql -U postgres
```
```sql
CREATE DATABASE seva_portal;
\q
```

---

## 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
- Set `DATABASE_URL` to match your local Postgres credentials, e.g.
  `postgresql://postgres:YOUR_PASSWORD@localhost:5432/seva_portal?schema=public`
- Set strong random values for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
  (e.g. run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` twice)
- Optionally change `SEED_SUPERADMIN_EMAIL` / `SEED_SUPERADMIN_PASSWORD`

Run migrations and seed the first Superadmin account:
```bash
npx prisma migrate dev --name init
npm run prisma:seed
```

> If you're updating an existing install to get deferred payments, completed-work delivery, and notifications, run an additional migration instead:
> ```bash
> npx prisma migrate dev --name add_deliverables_and_push
> ```

Start the API:
```bash
npm run dev
```
The API runs at `http://localhost:5000`. Health check: `http://localhost:5000/health`.

---

## 3. Frontend Setup

In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
The app runs at `http://localhost:5173` and proxies `/api` and `/uploads` to the backend automatically (see `vite.config.js`).

---

## 4. First Login

Go to `http://localhost:5173/admin/login` and sign in with the Superadmin credentials from your `.env` (`SEED_SUPERADMIN_EMAIL` / `SEED_SUPERADMIN_PASSWORD`). **Change the password immediately** from the Profile page.

From there you can:
- Create Subadmin accounts (Subadmins → New Subadmin)
- Create and publish services (Services → New Service → Publish)
- Configure portal branding/content (Portal Settings)

Published services then appear on the public homepage at `http://localhost:5173/`.

---

## 5. Project Structure

```
seva-portal/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # All data models
│   │   └── seed.js             # Bootstraps the Superadmin account
│   └── src/
│       ├── config/prisma.js
│       ├── controllers/        # Business logic per resource
│       ├── middleware/         # auth, RBAC, validation, uploads, errors
│       ├── routes/             # Express routers
│       ├── sockets/            # Socket.IO auth + rooms
│       ├── utils/
│       ├── app.js
│       └── server.js
└── frontend/
    └── src/
        ├── api/client.js       # Axios instance + auto token refresh
        ├── context/AuthContext.jsx
        ├── components/
        │   ├── layout/         # Public header/footer/layout
        │   ├── public/         # ServiceCard, etc.
        │   └── admin/          # AdminLayout, StatCard
        ├── pages/
        │   ├── public/         # Home, ServiceDetail, Order, Track, Legal
        │   └── admin/          # Login, Dashboard, Services, Orders, Subadmins, Settings, Profile
        ├── routes/ProtectedRoute.jsx
        └── App.jsx
```

---

## 6. Role & Access Control Summary

| Action | Superadmin | Subadmin |
|---|---|---|
| Create/suspend/delete Subadmins | ✅ | ❌ |
| View all Subadmins' services/orders | ✅ | ❌ (own only) |
| Create/edit/publish own services | ✅ | ✅ |
| Suspend any service | ✅ | ❌ |
| Reassign an order to another admin | ✅ | ❌ |
| Configure portal branding/content | ✅ | ❌ |
| View dashboard analytics | ✅ (platform-wide) | ✅ (own scope only) |

Every `Service` and `Order` row carries an `ownerId`. All list/detail queries are automatically scoped to `ownerId = currentAdmin.id` unless the caller is `SUPERADMIN`, enforced server-side in the controllers — not just hidden in the UI — so a Subadmin cannot access another Subadmin's data even by guessing IDs directly against the API.

---

## 7. Notes & Next Steps

- **Document upload security — DONE**: every order now gets a one-time upload token (hashed in the DB) returned once when the order is placed. Uploading a document requires this token, so a stranger who only knows the order number/ID cannot attach files to someone else's order. If you change `prisma/schema.prisma`, re-run `npx prisma migrate dev --name add_upload_token`. Next hardening step: email the token to the customer instead of only showing it in the browser.
- **Testing — DONE (backend)**: Jest + Supertest test suite added under `backend/tests/`. Covers token utilities, pagination helpers, the login flow (wrong password, suspended accounts, validation), and — most importantly — the **RBAC ownership-scoping guarantee**: a Subadmin's Prisma queries are asserted to always include `ownerId: <their own id>`, and Superadmin-only routes reject Subadmins with 403. Run with:
  ```bash
  cd backend
  npm run test
  ```
  These tests mock the Prisma client (see `src/config/__mocks__/prisma.js`), so they run fully offline without a real database. Frontend tests (Vitest + React Testing Library) are not yet included — recommended before production.
- **Payments — DONE**: Razorpay Checkout is wired end-to-end (see section 8 below). If you don't configure Razorpay keys, the portal keeps working exactly as before — the "Pay Now" button returns a clear "not configured" message and admins can still mark orders `PAID` manually from the Order detail page.
- **Deferred payment — DONE**: if a customer didn't pay at order time, they can go to the Track Order page anytime, look up their order, and click "Pay Now" — same Razorpay flow as at checkout.
- **Delivering completed work — DONE**: admins upload the finished file from the Order detail page ("Deliver Completed Work"). The customer is notified (email + browser push) and can download it from the Track Order page under "Your completed work is ready."
- **Notifications — DONE (free tier)**: see section 9 below. Email (via any free SMTP) and Browser Push (via free VAPID keys, no third-party service) fire automatically on order placement, status changes, payment received, and completed-work delivery. Both are fully optional — leave the env vars blank and the portal works exactly as before.
- **Real-time admin notifications**: Socket.IO is wired for `new_order`, `order_reassigned`, and `payment_received` events, shown to admins live in the dashboard.
- **File storage**: uploads (customer documents + deliverables) are stored on local disk (`backend/uploads/`). For production, swap `multer.diskStorage` for an S3-compatible bucket.
- **Frontend tests**: not yet included — recommend Vitest + React Testing Library before production.

---

## 9. Notifications Setup (Email + Browser Push — both free)

Both channels are **off by default** and fail silently if unconfigured — nothing else in the app depends on them.

### Email (order confirmations, status updates, payment receipts, completed-work alerts)

Add to `backend/.env`. Any of these free options work:

| Provider | Free limit | Notes |
|---|---|---|
| Gmail | 500/day | Use an **App Password**, not your real password (Google Account → Security → App Passwords) |
| Brevo (Sendinblue) | 300/day forever | No card required — https://www.brevo.com |
| Ethereal | Unlimited (fake) | For local testing only — emails never actually deliver, but you can preview them: https://ethereal.email |

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Seva Portal <you@gmail.com>"
```

### Browser Push (real-time, no email needed, works even while the customer isn't on the page — as long as their browser is running)

100% free forever — no external account needed. Generate a key pair once:
```bash
cd backend
npx web-push generate-vapid-keys
```
Copy the output into `.env`:
```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@sevaportal.com
```
Customers opt in per-order from the "🔔 Enable Notifications for This Order" button (shown right after placing an order, and on the Track Order page). Each browser subscription is tied to that specific order — no customer account required.

### What triggers a notification

| Event | Email | Push |
|---|---|---|
| Order placed | ✅ (confirmation) | — |
| Status changed by admin | ✅ | ✅ |
| Payment marked/verified as PAID | ✅ | ✅ |
| Admin uploads completed work | ✅ | ✅ |

Restart the backend after adding any of these env vars.

---

## 8. Razorpay Payment Setup (optional)

Online payments are **off by default**. To enable them:

1. Create a free Razorpay account at https://dashboard.razorpay.com/signup and grab your **Test Mode** Key ID / Key Secret from Settings → API Keys.
2. Add them to `backend/.env`:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
   ```
3. Re-run the Prisma migration to add the payment tracking columns:
   ```bash
   cd backend
   npx prisma migrate dev --name add_razorpay_fields
   ```
4. **(Recommended) Set up the webhook** so payments are confirmed server-side even if the customer closes their browser mid-payment:
   - In Razorpay Dashboard → Settings → Webhooks, add a webhook pointing to `https://your-domain.com/api/public/payments/webhook` (use a tool like `ngrok` to test locally, e.g. `ngrok http 5000`)
   - Subscribe to the `payment.captured` event
   - Copy the webhook secret shown there into `backend/.env` as `RAZORPAY_WEBHOOK_SECRET`
5. Restart the backend.

**How it works:** when a customer places an order and clicks "Pay Now", the frontend loads Razorpay Checkout, the backend creates a matching Razorpay order (`/api/public/payments/create-order`), and on success the frontend calls `/api/public/payments/verify` to confirm the payment signature immediately. The `/api/public/payments/webhook` endpoint is the authoritative server-to-server confirmation and will mark the order `PAID` even if the customer's browser never calls `/verify` (e.g. they closed the tab right after paying).
