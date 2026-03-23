# AI Grading Assistant

An AI-powered RESTful API server that helps instructors grade student submissions. Instructors create assignments with questions and rubrics, students submit answers, and the AI evaluates responses with scores and feedback.

## Architecture

- **`server/`** — Express + TypeScript API (port 3001)
- **`client/`** — React + TypeScript via Vite (port 5173)
- **Database** — SQLite (file-based, no external DB server needed)
- **AI** — OpenAI-compatible API (GPT / DeepSeek)

## Features

- JWT-based authentication (register / login)
- Role-based access: student, instructor, admin
- Instructors create assignments with questions + rubric
- Students submit answers; AI grades against the rubric
- 20 free API calls per user, warning after limit reached
- Admin dashboard for monitoring API usage
- SQL injection & XSS protection

## Prerequisites

- Node.js 20+
- npm
- An OpenAI or DeepSeek API key

## Getting Started

**1. Install server dependencies**

```bash
cd server
npm install
```

**2. Configure environment**

```bash
cp .env.example .env
```

Edit `server/.env` and add your AI API key:

```
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=your-secret-key
AI_API_KEY=your-openai-or-deepseek-key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

**3. Start the server** (auto-creates DB + seeds test users)

```bash
npm run dev
```

**4. Start the client**

```bash
cd client
npm run dev
```

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@admin.com | 111 |
| User | john@john.com | 123 |

## API Endpoints

### Auth
- `POST /auth/register` — Create account
- `POST /auth/login` — Login, returns JWT

### Assignments (instructor/admin)
- `POST /assignments` — Create assignment
- `GET /assignments` — List assignments
- `GET /assignments/:id` — Get assignment details
- `PUT /assignments/:id` — Update assignment
- `DELETE /assignments/:id` — Delete assignment

### Submissions (student)
- `POST /assignments/:id/submit` — Submit answers for AI grading
- `GET /submissions` — List own submissions
- `GET /submissions/:id` — Get submission with AI feedback

### Admin
- `GET /admin/users` — List all users + API usage
- `GET /admin/stats` — System-wide statistics

### General
- `GET /health` — Health check

## Production Build

```bash
cd server && npm run build && npm start
cd client && npm run build && npm run preview
```

Set `VITE_API_URL` in `client/.env` to point at your deployed API server.
