# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (run from `backend/`)
```bash
npm run dev       # Start with nodemon (auto-reload)
npm start         # Start without auto-reload
```

### Frontend (run from `frontend/`)
```bash
npm run dev       # Start Vite dev server on :5173
npm run build     # Production build
npm run lint      # ESLint check
npm run preview   # Preview production build
```

Both servers must run concurrently during development. The frontend Vite dev server proxies `/api/*` to `http://localhost:5000`.

### Environment Setup
Copy `backend/.env.example` to `backend/.env` and fill in:
- `MONGODB_URI` — MongoDB Atlas connection string (free M0 tier)
- `JWT_SECRET` — any long random string
- `PORT` — defaults to 5000
- `CLIENT_URL` — frontend origin for CORS (`http://localhost:5173` in dev)

Frontend requires no `.env` file in development (Vite proxy handles API routing). In production, set `VITE_API_URL` to the deployed backend URL.

## Architecture

### Monorepo Structure
Two independently deployable apps sharing one Git repo:
- `backend/` — Express.js REST API (Node.js, CommonJS modules)
- `frontend/` — React SPA (Vite, ES modules)

### Backend (`backend/src/`)
- **`server.js`** — Entry point; registers routes, CORS, and global error handler
- **`config/db.js`** — Mongoose connection with 5-retry logic
- **`middleware/auth.js`** — JWT `protect` middleware; attaches `req.user` from Bearer token
- **`models/`** — Mongoose schemas: `User`, `Group`, `Expense`, `Settlement`
- **`controllers/`** — Route logic; `expenseController.getBalances` contains the core balance calculation
- **`routes/auth.js`** — `/api/auth` (register, login, me)
- **`routes/groups.js`** — `/api/groups` and all nested routes (expenses, balances, settlements)

### Frontend (`frontend/src/`)
- **`services/api.js`** — Single Axios instance; request interceptor injects JWT; response interceptor clears token and redirects on 401
- **`context/AuthContext.jsx`** — Global auth state (user, token, login/logout); persists to localStorage
- **`context/ToastContext.jsx`** — Toast notification system (3s auto-dismiss)
- **`components/ProtectedRoute.jsx`** — Redirects unauthenticated users to `/login`
- **`pages/GroupDetailPage.jsx`** — Most complex page: tabs for expenses/settlements, balance breakdown, add-expense form with per-member share splitting

### Balance Calculation (key business logic)
Lives in `expenseController.getBalances`. Algorithm:
1. Initialize all members at net balance = 0
2. For each expense: add amount to payer's balance, subtract each participant's share from their balance
3. For each settlement: add amount to `fromUser`, subtract from `toUser`
4. Positive result = owed money; negative = owes money

### Expense Shares Validation
When creating an expense, the sum of all participant shares must equal the total amount (±0.01 float tolerance). The frontend's "Split Evenly" button divides `amount / memberCount` per participant.

### Auth Flow
Register/login → JWT returned → stored in `localStorage` → injected on every request → 401 response clears token and redirects to `/login`.

### Deployment
- Backend: Vercel Node.js runtime (`backend/vercel.json`)
- Frontend: Vercel static site with SPA rewrite rule (`frontend/vercel.json`)
- Both are deployed as separate Vercel projects
