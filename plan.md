# Fullstack Implementation Plan: Blog-Nest

Plan and architect the **Blog-Nest** fullstack web application. The project consists of a **Vite + React (TypeScript)** frontend (`blog`) and a **stateless NestJS REST API** backend (`server`) connected to a **Supabase (PostgreSQL)** database.

---

## Technical Overview & Architecture

```
[ Frontend: React / Vite (Port 5173) ]
           │
           │ Axios HTTP Requests (Bearer JWT)
           ▼
[ Backend: NestJS Stateless REST API (Port 5000) ]
           │
           │ Supabase Client (Service Role Key / JWKS Validation)
           ▼
[ Database: Supabase PostgreSQL & Auth ]
  • users / profiles
  • articles
  • follows
  • notifications
  • subscriptions
```

### Key Architectural Decisions
1. **Stateless NestJS Backend**:
   - The backend holds no session state in memory.
   - Authentication is performed via standard JWT Bearer tokens issued by Supabase Auth (or validated statelessly via Supabase JWKS/Secret Key).
   - All persistence resides in Supabase PostgreSQL database.
2. **Database Seeding Strategy**:
   - Since there are no initial users in the database, NestJS will include a **Seeding Service / Script**.
   - On initial setup (or via `npm run seed`), the backend seeds initial users, authors, sample articles with rich markdown content, tags, and initial notifications into Supabase.
3. **API Contract Alignment**:
   - The NestJS endpoints match the contract defined in `blog/src/data/api.ts`:
     - `/api/auth/*` (register, login, me)
     - `/api/users/*` (get profile, update profile, follow, unfollow)
     - `/api/articles/*` (list with filters/pagination, get by ID, create, update, delete)
     - `/api/notifications/*` (list, unread count, mark read, mark all read)
     - `/api/subscriptions/*` (subscribe, verify, unsubscribe)

---

## Technical Considerations & Setup

> **Supabase Dependencies**: `@supabase/supabase-js` is recommended for server-side queries with the service key. `@supabase/server` was recently installed; we will verify or add `@supabase/supabase-js` if required for NestJS services.

> **Port Configuration**: Frontend configured to hit `http://localhost:5000/api`. We will configure NestJS `main.ts` to listen on port `5000` with global prefix `api` and CORS enabled for `http://localhost:5173`.

---

## Open Questions & Decisions

> **1. Database Migrations / SQL Setup**: Should we provide a SQL schema migration file (e.g. `schema.sql`) to be run in the Supabase SQL Editor, or rely on auto-creating tables via Supabase API / Prisma / TypeORM? (Executing SQL in Supabase Dashboard is recommended for initial table creation).
>
> **2. Seed Trigger**: Would you prefer the seeding to happen automatically when the NestJS application starts up if the `users` table is empty, or explicitly via `npm run seed` command?

---

## Database Schema (Supabase PostgreSQL)

### 1. `profiles` (Users)
- `id` (UUID, PK, matches Supabase Auth UID or generated UUID)
- `name` (TEXT)
- `username` (TEXT, UNIQUE)
- `email` (TEXT, UNIQUE)
- `avatar` (TEXT, NULLABLE)
- `bio` (TEXT, NULLABLE)
- `followers_count` (INT, DEFAULT 0)
- `following_count` (INT, DEFAULT 0)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 2. `articles`
- `id` (UUID, PK)
- `title` (TEXT)
- `subtitle` (TEXT, NULLABLE)
- `body` (TEXT)
- `thumbnail` (TEXT, NULLABLE)
- `tags` (TEXT[])
- `read_time` (INT, DEFAULT 5)
- `is_draft` (BOOLEAN, DEFAULT false)
- `is_member_only` (BOOLEAN, DEFAULT false)
- `published_at` (TIMESTAMPTZ, NULLABLE)
- `author_id` (UUID, FK -> profiles.id)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 3. `follows`
- `follower_id` (UUID, FK -> profiles.id)
- `following_id` (UUID, FK -> profiles.id)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- PRIMARY KEY (`follower_id`, `following_id`)

### 4. `notifications`
- `id` (UUID, PK)
- `user_id` (UUID, FK -> profiles.id)
- `type` (TEXT) - e.g., 'follow', 'article_published', 'like'
- `message` (TEXT)
- `is_read` (BOOLEAN, DEFAULT false)
- `article_id` (UUID, NULLABLE, FK -> articles.id)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 5. `subscriptions`
- `id` (UUID, PK)
- `email` (TEXT, UNIQUE)
- `topics` (TEXT[])
- `newsletter` (BOOLEAN, DEFAULT true)
- `verified` (BOOLEAN, DEFAULT false)
- `token` (TEXT)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

---

## Proposed File Changes

---

### Backend (NestJS Server: `server/`)

#### [NEW] [supabase.module.ts](file:///c:/Users/hp/Desktop/Blog-Nest/server/src/supabase/supabase.module.ts)
#### [NEW] [supabase.service.ts](file:///c:/Users/hp/Desktop/Blog-Nest/server/src/supabase/supabase.service.ts)
- Provides a centralized, singleton Supabase client wrapper configured with `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.

#### [NEW] [auth.module.ts](file:///c:/Users/hp/Desktop/Blog-Nest/server/src/auth/auth.module.ts)
#### [NEW] [auth.controller.ts](file:///c:/Users/hp/Desktop/Blog-Nest/server/src/auth/auth.controller.ts)
#### [NEW] [auth.service.ts](file:///c:/Users/hp/Desktop/Blog-Nest/server/src/auth/auth.service.ts)
#### [NEW] [jwt-auth.guard.ts](file:///c:/Users/hp/Desktop/Blog-Nest/server/src/auth/guards/jwt-auth.guard.ts)
- Implement `/api/auth/register`, `/api/auth/login`, and `/api/auth/me`.
- Uses Supabase Auth / JWT verification for stateless session management.

#### [NEW] [users.module.ts](file:///c:/Users/hp/Desktop/Blog-Nest/server/src/users/users.module.ts)
#### [NEW] [users.controller.ts](file:///c:/Users/hp/Desktop/Blog-Nest/server/src/users/users.controller.ts)
#### [NEW] [users.service.ts](file:///c:/Users/hp/Desktop/Blog-Nest/server/src/users/users.service.ts)
- Public profile fetching `/api/users/:id`
- Profile update `/api/users/:id`
- Follow/Unfollow endpoints `/api/users/:authorId/follow`

#### [NEW] [articles.module.ts](file:///c:/Users/hp/Desktop/Blog-Nest/server/src/articles/articles.module.ts)
#### [NEW] [articles.controller.ts](file:///c:/Users/hp/Desktop/Blog-Nest/server/src/articles/articles.controller.ts)
#### [NEW] [articles.service.ts](file:///c:/Users/hp/Desktop/Blog-Nest/server/src/articles/articles.service.ts)
- Article CRUD operations, pagination, tag filtering, draft & member status filtering.

#### [NEW] [notifications.module.ts](file:///c:/Users/hp/Desktop/Blog-Nest/server/src/notifications/notifications.module.ts)
#### [NEW] [subscriptions.module.ts](file:///c:/Users/hp/Desktop/Blog-Nest/server/src/subscriptions/subscriptions.module.ts)
- Handling notifications and email newsletter subscriptions.

#### [NEW] [seed.service.ts](file:///c:/Users/hp/Desktop/Blog-Nest/server/src/seed/seed.service.ts)
- Data Seeding Service: Automatically seeds 3 sample authors (e.g. Sarah Connor, Alex Rivera, Elena Rostova) and 5+ sample articles with tags and notifications if the DB is empty on startup.

#### [MODIFY] [main.ts](file:///c:/Users/hp/Desktop/Blog-Nest/server/src/main.ts)
- Global route prefix `api`
- Enable CORS for frontend `http://localhost:5173`
- Listen on port `5000`

---

### Frontend Integration (`blog/`)

#### [MODIFY] [lib/api.ts](file:///c:/Users/hp/Desktop/Blog-Nest/blog/src/lib/api.ts)
- Ensure base URL points to `http://localhost:5000/api`.

#### [MODIFY] [context/AuthContext.tsx](file:///c:/Users/hp/Desktop/Blog-Nest/blog/src/context/AuthContext.tsx)
- Ensure JWT auth token persistence and automatic user profile sync with the backend.

---

## Verification Plan

### Automated Tests
- Run `npm run test` in `server` to execute NestJS controller and service unit tests.
- Run `npm run build` in both `blog` and `server` to ensure clean TypeScript compilation.

### Manual Verification
1. **Start NestJS Server**: Run `npm run dev` in `server`. Verify server starts on port `5000` and executes initial database seeding.
2. **Start Frontend App**: Run `npm run dev` in `blog`.
3. **Verify Seeded Data**: Open browser, navigate to home page, verify articles and authors load dynamically from the backend API.
4. **Test User Auth**: Register a new user, log in, view profile, edit profile, write a new article, and verify state persistence.
