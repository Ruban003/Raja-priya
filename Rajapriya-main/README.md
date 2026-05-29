# Rajapriya Salon Management

MERN salon management application with a Vite React admin panel and an Express/MongoDB API.

## What was rectified

| Priority | Area | Change made | Why |
| --- | --- | --- | --- |
| Critical | Secrets | Replaced real `MONGO_URI` and `JWT_SECRET` in `backend/.env.example` with placeholders | Prevents credential leakage |
| Critical | Seed route | Removed public `/api/seed` from `backend/server.js` | Prevents public creation of admin users |
| Critical | Center access | Added shared center authorization helpers and applied them to appointments, billing, customers, services, staff, campaigns, reports, and centers | Prevents one center user from reading or editing another center's data |
| High | Billing | Moved customer bill route before `/:id` and made bill numbers include a center suffix | Prevents route conflicts and reduces duplicate bill number risk |
| High | Logging | Added dependency-free structured JSON logger in `backend/utils/logger.js` | Makes deployment logs easier to search and forward to cloud logging |
| High | Project hygiene | Added `.gitignore` | Keeps secrets, build output, and `node_modules` out of source control |
| Medium | Dashboard | Refetches dashboard data when the selected center changes | Prevents stale center reports |
| Medium | CSV exports | Added safer CSV escaping in customer, service, and campaign exports | Prevents malformed CSV when values contain quotes or commas |

## Setup

### Backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Update `.env` with real values:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority
JWT_SECRET=replace_with_a_long_random_secret
CORS_ORIGINS=https://your-frontend-domain.com,http://localhost:5173
LOG_LEVEL=info
PORT=5001
SEED_RV_OWNER_PASSWORD=replace_with_a_strong_password
SEED_GLAM_OWNER_PASSWORD=replace_with_a_strong_password
SEED_GLAM_MANAGER_PASSWORD=replace_with_a_strong_password
```

### Admin frontend

```bash
cd admin
npm install
npm run dev
```

Set this in the admin deployment environment:

```env
VITE_API_URL=https://your-backend-domain.com
```

## Firebase / Cloud logging recommendation

If you mean Firebase for login, the best path is to use Firebase Authentication only for identity and keep MongoDB for salon data. After Firebase verifies the user, the backend should still map the Firebase UID to an app user record with role and center access.

For logging, the current project now writes structured JSON logs. On Render, Railway, Google Cloud Run, or similar platforms, these logs can be forwarded to Cloud Logging without changing application logic. If the backend is deployed on Google Cloud, use Cloud Run plus Google Cloud Logging for the cleanest setup.

## Still recommended next

| Priority | Item | Notes |
| --- | --- | --- |
| Critical | Rotate old MongoDB password and JWT secret | The old values were exposed in the previous `.env.example` |
| High | Add request validation | Use Zod/Joi/express-validator for forms, dates, ObjectIds, prices, and CSV imports |
| High | Add audit logs | Track who created/updated/deleted bills, services, campaigns, and users |
| Medium | Add tests | API tests for auth, center isolation, billing, and CSV import/export |
| Medium | Decide auth direction | Keep JWT or migrate to Firebase Auth, but avoid mixing both without a clear backend mapping |
