# QueueBridge

A multi-tenant queue management system with real-time updates.

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: MongoDB (Mongoose)
- **Real-time**: Socket.io
- **Auth**: JWT (7-day expiry)

## Project Structure

```
QueueBridge/
├── server/          # Express + Socket.io backend
└── client/          # React + Vite frontend
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Server Setup

```bash
cd server
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm install
npm run dev
```

Server runs on `http://localhost:3001`.

### Client Setup

```bash
cd client
npm install
npm run dev
```

Client runs on `http://localhost:5173`.

## Environment Variables

### Server (`server/.env`)

| Variable    | Description                        | Default                                    |
|-------------|------------------------------------|--------------------------------------------|
| PORT        | Server port                        | 3001                                       |
| MONGO_URI   | MongoDB connection string          | mongodb://localhost:27017/queuebridge      |
| JWT_SECRET  | Secret key for JWT signing         | (required — change in production)          |
| CLIENT_URL  | Frontend origin for CORS           | http://localhost:5173                      |

### Client (`client/.env`)

| Variable      | Description            | Default                    |
|---------------|------------------------|----------------------------|
| VITE_API_URL  | Backend API base URL   | http://localhost:3001/api  |

## API Endpoints

### Auth
| Method | Endpoint            | Auth | Description                      |
|--------|---------------------|------|----------------------------------|
| POST   | /api/auth/register  | No   | Register admin + create org      |
| POST   | /api/auth/login     | No   | Login, returns JWT               |
| GET    | /api/auth/me        | JWT  | Get current user profile         |

### Organizations
| Method | Endpoint                   | Auth | Description            |
|--------|----------------------------|------|------------------------|
| GET    | /api/organizations         | No   | List all organizations |
| GET    | /api/organizations/:slug   | No   | Get org by slug        |

### Queues (all require auth)
| Method | Endpoint               | Role  | Description                          |
|--------|------------------------|-------|--------------------------------------|
| GET    | /api/queues            | Any   | List queues for user's org           |
| POST   | /api/queues            | Admin | Create a new queue                   |
| PATCH  | /api/queues/:id/next   | Admin | Advance to next token (emits socket) |
| PATCH  | /api/queues/:id/toggle | Admin | Toggle active/inactive               |
| DELETE | /api/queues/:id        | Admin | Delete queue + all its tokens        |

### Tokens
| Method | Endpoint                    | Auth  | Description                       |
|--------|-----------------------------|-------|-----------------------------------|
| POST   | /api/tokens                 | No    | Generate token (public)           |
| GET    | /api/tokens/queue/:queueId  | Admin | List tokens in a queue            |
| PATCH  | /api/tokens/:id/status      | Admin | Update token status               |

## Socket Events

### Client → Server
| Event       | Payload       | Description                     |
|-------------|---------------|---------------------------------|
| join_org    | orgId: string | Join organization room          |
| leave_org   | orgId: string | Leave organization room         |
| join_queue  | queueId       | Subscribe to queue-level events |
| leave_queue | queueId       | Unsubscribe from queue events   |

### Server → Client
| Event        | Types                                         | Description              |
|--------------|-----------------------------------------------|--------------------------|
| queue_update | QUEUE_UPDATE, QUEUE_STATUS_CHANGE, NEW_TOKEN, TOKEN_STATUS_UPDATE | Real-time queue events |

## Multi-Tenancy

Each organization gets a unique slug (`/queue/:orgSlug`). All socket rooms, data access, and queue operations are scoped by `organizationId`. Admins can only manage queues and tokens belonging to their own organization.

## User Flows

### Admin
1. Register at `/register` — creates an admin account + organization
2. Log in at `/login`
3. Manage queues at `/admin`: create queues, call next token, pause/resume, view token list

### Queue User
1. Visit `/user` or `/queue/:orgSlug`
2. Select an organization
3. Enter your name and select a queue
4. Receive a token number — the display updates in real time via Socket.io
