# Connect – Global Real-time Messaging App

WhatsApp-style 1‑on‑1 chat with JWT auth, MongoDB, and Socket.io. Features: real-time delivery, online/last-seen, typing indicators, read receipts, auto-scroll.

**Demo accounts:** `test1@example.com` / `Password123!` · `test2@example.com` / `Password123!`

---

## Tech Stack

**Frontend:** React, Vite, Axios, Socket.io Client · **Backend:** Node, Express, Socket.io · **DB:** MongoDB (Mongoose)

---

## Getting Started

**Backend**

```bash
cd server
cp .env.example .env   # set MONGO_URI, JWT_SECRET, CLIENT_ORIGIN
npm install && npm run seed && npm run dev
```

**Frontend**

```bash
cd client
# .env: VITE_API_BASE_URL=http://localhost:5000  VITE_SOCKET_URL=http://localhost:5000
npm install && npm run dev
```

Open http://localhost:5173, log in with the demo accounts in two tabs, and chat.

---

## Environment

| Location   | Variable             | Example / purpose                          |
|-----------|----------------------|--------------------------------------------|
| `server/` | `PORT`               | `5000`                                     |
| `server/` | `MONGO_URI`          | MongoDB connection string                   |
| `server/` | `JWT_SECRET`         | Strong secret for JWT                       |
| `server/` | `CLIENT_ORIGIN`      | `http://localhost:5173` (CORS + Socket.io)  |
| `client/` | `VITE_API_BASE_URL`  | Backend URL for REST                        |
| `client/` | `VITE_SOCKET_URL`    | Backend URL for Socket.io                   |

---

## API & Socket (summary)

- **REST** (base `/api`): `POST /auth/register`, `POST /auth/login` · `GET/PUT /users/me`, `GET /users?q=` · `GET /chat/conversations`, `POST /chat/conversations/with`, `GET /chat/conversations/:id/messages`, `POST /chat/messages`, `POST /chat/conversations/:id/read`
- **Socket.io:** client emits `conversation:join`, `message:send`, `typing`, `messages:markRead`; server emits `message:new`, `typing`, `messages:read`

(Full request/response details are in the code: `server/src/routes/`, `server/src/socket/`.)

---

## Deployment

- **Backend:** Deploy `server` (e.g. Render/Railway). Set env from `.env.example`, enable WebSockets, set `CLIENT_ORIGIN` to your frontend URL.
- **Frontend:** Deploy `client` (e.g. Vercel). Set `VITE_API_BASE_URL` and `VITE_SOCKET_URL` to the deployed backend URL.

---

## Security & scope

Passwords hashed with bcrypt; JWT on protected routes; message content sanitized (XSS). CORS limited to `CLIENT_ORIGIN`.  
Current scope: 1‑on‑1 text chat only (no groups, media, or push). See code for roadmap ideas.
