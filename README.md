# 🪹 BlogNest

> A modern, full-stack Medium-inspired publishing platform built with **React 19**, **Vite**, **NestJS 11**, **TypeORM**, **PostgreSQL**, and **WebSockets**.

---

## ✨ Features

- **✍️ Article Publishing & Reading**:
  - Full article creation, editing, tagging, and deletion.
  - Interactive clap system and reading time estimation.
  - Tag and author filtering.

- **👤 Rich Profiles & Avatar Selector**:
  - Customizable user profile bio, name, and social links.
  - Built-in DiceBear avatar modal picker with 16 avatar choices + custom image upload (Base64 storage).

- **🔔 Real-Time Notifications**:
  - Powered by **Socket.IO WebSockets** for instant delivery.
  - Interactive notification panel with **All**, **Unread**, and **Read** filter tabs.
  - Individual notification deletion & automatic 30-day purge for read notifications.

- **👥 Social & Follow System**:
  - Follow / Unfollow authors with real-time count updates.
  - Personalized activity feeds.

- **📬 Newsletter Subscriptions**:
  - Email subscription with topic preferences and verification tokens.

- **📚 Interactive Swagger API Docs**:
  - Complete OpenAPI documentation mounted at `/api/docs`.

---

## 🛠️ Tech Stack

### **Frontend (`blog/`)**
- **Framework**: React 19, Vite, TypeScript
- **Styling**: Tailwind CSS
- **State & Data Fetching**: TanStack React Query v5, Axios
- **Icons & UI**: Iconsax React, Lucide Icons, DiceBear Avatars (`@dicebear/core`, `@dicebear/collection`)

### **Backend (`server/`)**
- **Framework**: NestJS 11, Express, TypeScript
- **Database & ORM**: PostgreSQL, TypeORM
- **Authentication**: Passport JWT, Bcrypt
- **Real-Time Engine**: Socket.IO (`@nestjs/websockets`, `@nestjs/platform-socket.io`)
- **Documentation**: Swagger OpenAPI (`@nestjs/swagger`)

---

## 🚀 Quickstart Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [PostgreSQL](https://www.postgresql.org/) database running locally or hosted (e.g. Supabase, Neon, Render)

---

### 1. Environment Configuration

#### Backend Environment (`server/.env`)
Create a `.env` file inside the `server/` directory:
```env
PORT=3000
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/blognest
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRY=7d
```

#### Frontend Environment (`blog/.env`)
Create a `.env` file inside the `blog/` directory:
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

---

### 2. Backend Setup (`server/`)

```bash
# Navigate to backend directory
cd server

# Install dependencies
npm install

# Build the project
npm run build

# Start dev server with watch mode
npm run dev
```
The NestJS server will start on `http://localhost:3000`.

---

### 3. Frontend Setup (`blog/`)

Open a new terminal tab:
```bash
# Navigate to frontend directory
cd blog

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
The web app will open at `http://localhost:5173`.

---

## 🌱 Database Seeding & Demo Accounts

To populate your database with initial articles, tags, authors, and sample notifications, run:

```bash
cd server
npm run seed
```

### Pre-seeded Demo Accounts
All seeded accounts use the password: **`Password123!`**

| Name | Email | Username | Password |
| :--- | :--- | :--- | :--- |
| **Sarah Chen** | `sarah@example.com` | `sarahchen` | `Password123!` |
| **Marcus Reid** | `marcus@example.com` | `marcusreid` | `Password123!` |
| **Priya Nair** | `priya@example.com` | `priyanair` | `Password123!` |

---

## 📖 API Documentation & Swagger UI

Interactive Swagger API documentation is available at:
👉 **`http://localhost:3000/api/docs`**

Features:
- Live API testing console.
- JWT Bearer Authentication header support.
- Schema representations for Auth, Users, Articles, Notifications, and Subscriptions.

---

## 🗄️ Database Migrations

Database schema migrations are managed via TypeORM CLI. Refer to [MIGRATION.md](file:///c:/Users/hp/Desktop/Blog-Nest/MIGRATION.md) for full commands:

```bash
# Generate migration from entity changes
npm run migration:generate -- src/migrations/YourMigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

---

## 📂 Project Structure

```text
Blog-Nest/
├── blog/                      # React + Vite Frontend
│   ├── src/
│   │   ├── components/        # Navbar, NotificationsModal, AvatarPicker, etc.
│   │   ├── context/           # Auth & AuthGate Context
│   │   ├── data/              # API Client & Axios Endpoints
│   │   ├── hooks/             # TanStack Query Custom Hooks
│   │   └── pages/             # Home, ArticleView, Profile, Write, TagFeed
│   └── package.json
│
├── server/                    # NestJS Backend API
│   ├── src/
│   │   ├── articles/          # Articles Controller, Service, Module
│   │   ├── auth/              # Auth JWT Strategies & Guards
│   │   ├── entities/          # TypeORM Entities (Profile, Article, Notification, etc.)
│   │   ├── notifications/     # Notifications Service & WebSocket Gateway
│   │   ├── seed/              # Database Seeder Service
│   │   ├── subscriptions/     # Subscriptions Controller & Service
│   │   └── users/            # Users Profile & Follow System
│   └── package.json
│
├── MIGRATION.md               # TypeORM Database Migration Guide
└── README.md                  # Main Documentation
```

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
