# Bill Splitter — Full-Stack App

A full-stack bill splitting application built with **Node.js + Express + MongoDB** (backend) and **React + Vite + Tailwind CSS** (frontend).

---

## Features

- User registration & login with JWT authentication
- Create groups and invite members by email
- Add expenses with per-member share splitting (or split evenly)
- View live balance summaries per group
- Record settlements between members
- Expense categories: food, transport, accommodation, entertainment, utilities, shopping, other

---

## Project Structure

```
expense-tracker/
├── backend/
│   ├── src/
│   │   ├── config/       # MongoDB connection
│   │   ├── controllers/  # Route logic
│   │   ├── middleware/   # JWT auth guard
│   │   ├── models/       # Mongoose schemas
│   │   ├── routes/       # Express routers
│   │   └── server.js     # Entry point
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/   # Navbar, ProtectedRoute
    │   ├── context/      # AuthContext
    │   ├── pages/        # HomePage, LoginPage, RegisterPage, GroupsPage, GroupDetailPage
    │   ├── services/     # Axios API service
    │   └── utils/        # formatCurrency helper
    ├── vite.config.js
    └── package.json
```

---

## Prerequisites

- **Node.js** v18+
- **npm** v9+
- A **MongoDB Atlas** account (free tier works)

---

## MongoDB Atlas Setup

1. Go to [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas) and sign up / log in.
2. Click **Build a Database** → choose the **Free (M0)** tier.
3. Choose a cloud provider and region, then click **Create**.
4. Under **Security > Database Access**, click **Add New Database User**:
   - Set a username and a strong password.
   - Grant the role **Atlas admin** or **Read and write to any database**.
5. Under **Security > Network Access**, click **Add IP Address**:
   - For development, click **Allow Access from Anywhere** (`0.0.0.0/0`).
6. Once the cluster is created, click **Connect** → **Drivers** → copy the connection string.
   It looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
7. Replace `<username>` and `<password>` with your database user credentials.
8. Add the database name before the `?`:
   ```
   mongodb+srv://alice:secret@cluster0.xxxxx.mongodb.net/bill-splitter?retryWrites=true&w=majority
   ```

---

## Backend Setup

```bash
cd backend

# Copy environment template
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/bill-splitter?retryWrites=true&w=majority
JWT_SECRET=some_long_random_string_here
PORT=5000
CLIENT_URL=http://localhost:5173
```

Install dependencies and start:

```bash
npm install

# Development (auto-restarts on file changes)
npm run dev

# Production
npm start
```

The server runs at `http://localhost:5000`.

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

The Vite dev server proxies `/api/*` requests to `http://localhost:5000`, so no CORS issues during development.

---

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register a new user |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | ✓ | Get current user |
| GET | `/api/groups` | ✓ | List your groups |
| POST | `/api/groups` | ✓ | Create a group |
| GET | `/api/groups/:id` | ✓ | Get group details |
| DELETE | `/api/groups/:id` | ✓ | Delete a group (creator only) |
| GET | `/api/groups/:id/expenses` | ✓ | List expenses |
| POST | `/api/groups/:id/expenses` | ✓ | Add an expense |
| DELETE | `/api/groups/:id/expenses/:expId` | ✓ | Delete expense (payer only) |
| GET | `/api/groups/:id/balances` | ✓ | Get net balances |
| GET | `/api/groups/:id/settlements` | ✓ | List settlements |
| POST | `/api/groups/:id/settlements` | ✓ | Record a settlement |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend runtime | Node.js + Express |
| Database | MongoDB Atlas via Mongoose |
| Auth | bcryptjs + JWT |
| Frontend | React 19 + Vite |
| Styling | Tailwind CSS v4 |
| HTTP client | Axios |
| Routing | React Router v7 |
