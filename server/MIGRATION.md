# Database Migrations Guide (TypeORM & PostgreSQL)

This document provides a comprehensive guide on how database migrations work in the **BlogNest** backend (`server/`), how to generate schema changes, run pending migrations, and revert migrations safely.

---

## 📌 Overview

In BlogNest, database schema changes (tables, columns, indexes, foreign keys) are managed using **TypeORM CLI** connected to PostgreSQL via `src/data-source.ts`.

- **Location of Migration Files**: `src/migrations/*.ts`
- **Data Source Config**: `src/data-source.ts`
- **Database Connection**: Configured using `DATABASE_URL` in `.env`

> [!IMPORTANT]
> Always use migrations for database schema changes in production instead of relying on `synchronize: true`.

---

## 🛠️ Data Source Setup (`src/data-source.ts`)

The TypeORM CLI uses `src/data-source.ts` to inspect your TypeScript Entity classes (`Profile`, `Article`, `Notification`, `Subscription`, `Follow`) and compare them against the active PostgreSQL database schema.

```typescript
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import { Profile } from './entities/profile.entity';
import { Follow } from './entities/follow.entity';
import { Article } from './entities/article.entity';
import { Notification } from './entities/notification.entity';
import { Subscription } from './entities/subscription.entity';

dotenv.config();
const configService = new ConfigService();

export default new DataSource({
  type: 'postgres',
  url: configService.get<string>('DATABASE_URL'),
  ssl: { rejectUnauthorized: false },
  entities: [Profile, Follow, Article, Notification, Subscription],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
```

---

## 🚀 Migration CLI Commands

All commands should be executed inside the `server/` directory.

### 1. Auto-Generating a Migration from Entity Changes
When you modify or add columns in your TypeORM entities (e.g. adding `read_at: Date` to `Notification`), generate a migration file by running:

```bash
npm run migration:generate -- src/migrations/UpdateNotificationReadAt
```

**What this does**:
- Compares entity definitions in `src/entities/` with the current database schema.
- Automatically generates a timestamped file in `src/migrations/` containing the exact `up()` and `down()` SQL queries.

---

### 2. Creating a Blank Migration (Manual SQL)
If you need to write custom SQL queries or data transformations manually:

```bash
npm run migration:create -- src/migrations/CustomDataCleanup
```

**What this does**:
- Creates an empty migration template in `src/migrations/` with `up(queryRunner)` and `down(queryRunner)` methods for your custom TypeScript/SQL logic.

---

### 3. Applying Pending Migrations
To execute all unapplied migrations against the PostgreSQL database:

```bash
npm run migration:run
```

**What this does**:
- Runs the `up()` method of all pending migration files in order of creation timestamp.
- Records executed migrations in the `migrations` table in your PostgreSQL database.

---

### 4. Reverting the Last Applied Migration
If you need to roll back the most recent migration:

```bash
npm run migration:revert
```

**What this does**:
- Executes the `down()` method of the last applied migration, reversing the schema change and removing its record from the `migrations` table.

---

## 💡 Best Practices

1. **Commit Migration Files**: Always commit generated migration files (`src/migrations/*.ts`) to Git along with your entity changes.
2. **Review Generated SQL**: Before running `npm run migration:run`, review the generated `up()` and `down()` queries to verify safety.
3. **Seeding Initial Data**: To populate test database records after running migrations, run the seeding script:
   ```bash
   npm run seed
   ```
