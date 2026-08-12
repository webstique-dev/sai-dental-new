# Sai Dental Clinic – Digital Platform

Phase 1 scaffold: authentication, role-based access control (Admin /
Receptionist / Doctor), and the three role dashboards + navigation shells,
built from the PRD.

## Stack

- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT auth, bcrypt
- **Frontend:** React 18 (Vite), React Router, Tailwind CSS, Axios, lucide-react icons

## What's built (Phase 1)

- User model with `admin` / `receptionist` / `doctor` roles
- JWT login/logout, `GET /api/auth/me` session check
- Admin-only user management API (`/api/users`) — create, list, update, disable, reset password
- Backend RBAC middleware (`protect` + `allowRoles`) enforced on every route
- React auth context, protected routes, role-based redirects
- Sidebar navigation matching the PRD's per-role menu (section 30), with
  role-color coding (Doctor = teal, Receptionist = amber, Admin = slate)
- Functional Admin → Users page (real CRUD against the API)
- Placeholder pages for every other Phase 2+ screen, so the nav is complete
  and clickable even before those features are built

## What's NOT built yet (Phase 2+)

Everything else in the PRD: patient registration, appointment scheduling,
check-in queue, clinical examination forms, the interactive FDI tooth
chart, diagnosis/treatment planning, prescriptions, billing/invoicing,
follow-ups, reports & analytics, clinic settings, audit logging, backups.
These routes exist as clearly-labeled "Coming in Phase 2" placeholders so
the app is navigable end-to-end today.

## Getting started

### 1. Backend

```bash
cd server
cp .env.example .env
# edit .env — at minimum set MONGO_URI and JWT_SECRET
npm install
npm run seed     # creates one Admin, one Receptionist, one Doctor account
npm run dev       # starts on http://localhost:5000
```

You need a running MongoDB instance. Either install MongoDB locally, run it
via Docker (`docker run -d -p 27017:27017 mongo`), or use a free MongoDB
Atlas cluster and paste its connection string into `MONGO_URI`.

Seeded logins (also printed by `npm run seed`):

| Role         | Email               | Password       |
|--------------|----------------------|----------------|
| Admin        | admin@clinic.com     | Admin@12345    |
| Receptionist | reception@clinic.com | Reception@123  |
| Doctor       | doctor@clinic.com    | Doctor@12345   |

**Change these passwords immediately in any non-local environment.**

### 2. Frontend

```bash
cd client
npm install
npm run dev       # starts on http://localhost:5173
```

The frontend expects the API at `http://localhost:5000/api` by default.
To point it elsewhere, create `frontend/.env` with:

```
VITE_API_URL=https://your-api-host/api
```

### 3. Log in

Open `http://localhost:5173`, sign in with any seeded account, and you'll
land on that role's dashboard with its own sidebar and permissions.

## Project structure

```
dental-clinic-system/
├── backend/
│   ├── config/db.js
│   ├── controllers/       # authController, userController
│   ├── middleware/        # auth.js (JWT verify), roleCheck.js (RBAC)
│   ├── models/User.js
│   ├── routes/            # authRoutes, userRoutes
│   ├── utils/              # generateToken, seed script
│   └── server.js
└── frontend/
    └── src/
        ├── api/axios.js            # API client, attaches JWT, handles 401s
        ├── context/AuthContext.jsx # session state, login/logout
        ├── components/
        │   ├── ProtectedRoute.jsx
        │   ├── layout/              # Sidebar, Topbar, DashboardLayout
        │   └── common/              # StatCard, PlaceholderPage
        ├── pages/
        │   ├── admin/ | receptionist/ | doctor/
        │   ├── Login.jsx
        │   └── Unauthorized.jsx
        └── App.jsx                  # all routing
```

## Security notes for Phase 2+

- The backend is the real security boundary — `allowRoles()` middleware
  guards every route. The frontend's role checks are UX only.
- Add rate limiting (e.g. `express-rate-limit`) to `/api/auth/login`
  before going to production.
- Add server-side input validation (e.g. `zod` or `express-validator`) as
  new resources (patients, appointments, etc.) are added.
- Audit logging (PRD section 33) should hook into a shared middleware that
  writes to an `AuditLog` collection on every mutating request.

## Next steps

Continue in the same pattern established here — a Mongoose model, a
controller, a router with `protect` + `allowRoles(...)`, and a matching
React page — for: Patients → Appointments → Clinical Examination & Tooth
Chart → Treatment Plans & Prescriptions → Billing → Follow-Ups → Reports.
