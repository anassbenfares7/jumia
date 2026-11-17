# Jumia-Clone Marketplace (PERN)

This repository contains a full-stack marketplace prototype built with PostgreSQL, Express (TypeScript), React (Vite + TypeScript), and Node.js. It is a PERN-style e-commerce application focused on core marketplace flows, including authentication, vendor management, product listings, orders, reviews, and admin actions.

## 🏗️ Core Architecture

- **Backend**: TypeScript + Express API featuring JWT authentication, role-based access control (RBAC), and a PostgreSQL database pool layer.
- **Frontend**: React + Vite + TypeScript equipped with an Axios/Fetch API service wrapper.

---

## 📋 Requirements

Before setting up the project, ensure you have the following installed:
* **Node.js** (v18+ recommended)
* **npm** (or yarn / pnpm)
* **PostgreSQL** (Local instance or Cloud database)

> 💡 **Tip:** It is highly recommended to run the backend and frontend in separate terminal windows.

---

## 🚀 Quick Start & Development Setup

### 1. Database Setup
1. Create a new PostgreSQL database (e.g., `jumia_clone`).
2. Construct your database connection URL. It should follow this format:
   ```text
   postgres://username:password@localhost:5432/jumia_clone
   ```

### 2. Backend Installation
Open a terminal and navigate to the backend directory:
```bash
cd backend
npm install
```

### 3. Backend Environment Configuration
Create a `.env` file inside the `backend/` root folder:
```env
PORT=5000
DATABASE_URL=postgres://username:password@localhost:5432/jumia_clone
JWT_SECRET=replace_with_a_random_64_character_hex_secret
CORS_ORIGINS=http://localhost:5173
```
Generate a secret locally with `node -p "require('crypto').randomBytes(32).toString('hex')"` and use the generated value. The backend requires a PostgreSQL URL with a host and database name, a `JWT_SECRET` of at least 32 characters, and a valid `PORT` (defaults to `5000`). URL-encode reserved characters in database credentials.

`CORS_ORIGINS` is a comma-separated list of exact frontend origins (scheme and host, with an optional port, but no path). Local development defaults to `http://localhost:5173`; production requires this variable, so set `NODE_ENV=production` and configure the public frontend origin on the host. The backend validates configuration at startup and checks the PostgreSQL connection before listening. If the database is unavailable, the server exits with a clear error instead of starting in a broken state. The `/api/health` endpoint also checks database connectivity and returns HTTP 503 when it fails.

For frontend development, create `frontend/.env.local` with:
```env
VITE_API_URL=http://localhost:5000/api
```
For a production build, set `VITE_API_URL` to the public API base URL, including `/api`, and set the backend's `CORS_ORIGINS` to the frontend's public origin (for example, `https://shop.example.com`). `VITE_API_URL` is bundled into the browser application, so it must not contain secrets.

### Backend API Integration Tests
The backend integration suite requires a dedicated PostgreSQL database whose name contains `test`; it initializes the schema and removes the test records it creates. From `backend/`, set `TEST_DATABASE_URL` to that database and run:
```powershell
$env:TEST_DATABASE_URL = "postgres://username:password@localhost:5432/jumia_clone_test"
npm test
Remove-Item Env:TEST_DATABASE_URL
```
Do not point `TEST_DATABASE_URL` at a development or production database.

### 4. Database Schema Initialization
Apply the initialization SQL script to create the schema and seed the default categories:
```bash
psql "postgres://username:password@localhost:5432/jumia_clone" -f src/database/init.sql
```
*(Alternatively, copy and run the contents of `src/database/init.sql` inside your preferred database client tool like PgAdmin or DBeaver).*

The initialization script can be re-run against a fresh database or the schema from the previous version of this project. For other existing databases, review the schema differences and apply a migration before deploying; `CREATE TABLE IF NOT EXISTS` does not alter existing table definitions.

For local development only, `src/database/seed.sql` inserts two sample products for the first approved vendor. Create and approve a development vendor before running it:
```bash
psql "postgres://username:password@localhost:5432/jumia_clone" -f src/database/seed.sql
```
Do not run the sample-data script in production.

### 5. Running the Application

#### Development Mode
```bash
# Run Backend (From /backend)
npm run dev

# Run Frontend (From /frontend)
cd ../frontend
npm install
npm run dev
```
* The backend API server will listen on `http://localhost:5000` by default.
* Open the Vite local URL printed in your frontend terminal console (usually `http://localhost:5173`).

#### Production Mode
```bash
# Build and Start Backend
cd backend
npm run build
npm start

# Build and Preview Frontend
cd frontend
npm run build
npm run preview
```

## Docker Staging

The repository includes host-neutral Docker images and a PostgreSQL Compose stack.

1. Copy `.env.docker.example` to `.env`.
2. Replace every placeholder secret. Use a URL-safe PostgreSQL password and a `JWT_SECRET` of at least 32 characters.
3. Set `CORS_ORIGINS` to the exact public frontend origin, including port when not using standard HTTPS.
4. Set `VITE_API_URL` to the public API origin plus `/api`.
5. Start the stack:
   ```bash
   docker compose up --build -d
   ```
6. Verify:
   - Frontend: `http://localhost:8080/health`
   - API health: `http://localhost:5000/api/health`
   - Full frontend: `http://localhost:8080`

PostgreSQL is initialized from `backend/src/database/init.sql` only on a new Docker volume. PostgreSQL data is persisted in the `postgres_data` volume. The API and database are not exposed as database ports on the host, while the API and frontend ports are configurable.

For an existing database or external PostgreSQL host, do not rely on the Compose init script. Set `DATABASE_URL` through your hosting platform or a compose override, review schema differences, and apply migrations explicitly. Never deploy `backend/.env`, database credentials, or secrets in an image.

For HTTPS deployments, terminate TLS at a reverse proxy or platform load balancer, set `CORS_ORIGINS` to the HTTPS frontend origin, set `VITE_API_URL` to the HTTPS API URL, and publish only the proxy-facing ports.

## Staging and Operations

### Launch checks

After deployment, verify:

1. `GET /api/health` returns HTTP 200 while PostgreSQL is available.
2. The frontend loads over HTTPS and calls only the configured API URL.
3. Buyer registration/login and cart demo checkout complete successfully.
4. Vendor registration, pending approval, product listing, and fulfillment status updates work.
5. Admin approval and product moderation work and reject unauthorized accounts.
6. Demo orders remain `pending`; no order is marked paid.

### Database backup and restore

Create and verify an encrypted PostgreSQL backup before migrations:

```bash
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > jumia-backup.dump
```

Restore to a clean database only after stopping writes:

```bash
docker compose exec -T postgres pg_restore --clean --if-exists -U "$POSTGRES_USER" -d "$POSTGRES_DB" < jumia-backup.dump
```

Store backups outside the host, use encryption and retention limits, and test restores periodically.

### Monitoring and rollback

- Monitor frontend/API/container health, PostgreSQL disk usage, API 5xx rates, authentication failures, and container restarts.
- Use the platform or Docker logs for API and proxy logs; never log JWT secrets or database URLs.
- Roll back by redeploying the previous known-good frontend/API image tags and restoring the database backup if the migration is incompatible.
- Do not roll back a database after new writes unless it has been backed up and the application is taken out of service.

---

## 🔌 API Routes Overview

All endpoints are prefixed with `/api` and managed via Express routers.

| Module | Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | POST | `/api/auth/register` | Create a new user account | Public |
| | POST | `/api/auth/login` | Authenticate user & return JWT token | Public |
| **Products**| GET | `/api/products` | Retrieve all product listings | Public |
| | POST | `/api/products` | Create a new product listing | Vendor Only |
| **Vendors** | POST | `/api/vendors/register-profile` | Register vendor business credentials | Authenticated |
| | GET | `/api/vendors/orders` | Fetch orders belonging to the vendor | Vendor Only |
| | PUT | `/api/vendors/orders/:id/status`| Update shipping/fulfillment status | Vendor Only |

### Checkout payment mode

Checkout is demo-only: it creates an order and reserves inventory, but does not collect payment. Such orders remain `pending` and must not be treated as paid. After updating an existing database, re-run the documented `psql ... -f src/database/init.sql` command from `backend/`; the script also resets payment records created by the previous mock checkout. Do not use this checkout for a live store; a real payment provider and verified server-side payment confirmation are required before accepting real orders.

### Marketplace workspaces

- Buyers can browse and search listings, place demo orders, and review order history.
- Vendors can submit a business profile for approval, create and review listings after approval, and update fulfillment statuses for their order items.
- Administrators can approve pending vendor applications and remove products from the catalog.
- Vendor-side product editing and removal are not available in this prototype; product removal is currently an administrator action.

---

## 🛠️ Project Configuration Notes

* **Frontend API Client**: The frontend reads `VITE_API_URL` at build time and uses `http://localhost:5000/api` by default during development.
* **Token Management**: Upon a successful login, the frontend securely saves the session JWT within `localStorage` under the key string `jumia_token`.
* **Database Layer**: Database connections utilize high-performance connection pooling via `node-postgres`, configured in `backend/src/config/db.ts`.
