# Sandbox API

NestJS REST API project I built to practice production patterns. Uses Sequelize with TypeScript, handles complex database relationships, and includes auth, file uploads, and a bunch of other stuff you'd need in a real app.

## Getting Started

```bash
npm install
npm run docker:up      # Starts MySQL/Postgres + Redis
npm run db:setup       # Creates DB, runs migrations, seeds data
npm run dev            # Starts the app
```

That's it. API should be running at `http://localhost:8000/api`

## What's Here

I've got a few modules set up:

- **Auth** - JWT tokens, OTP email verification, password reset, Google OAuth. Standard stuff.
- **Users** - CRUD operations plus file uploads (avatars, multiple files) with actual file type validation (not just extension checking).
- **Products** - E-commerce CRUD with search/filtering.
- **Academic stuff** - Students, Teachers, Courses, Departments. This one has the complex relationships - many-to-many joins, aggregations, all that.

The database setup supports both MySQL and PostgreSQL. Just change `DB_DIALECT` in your `.env`. Defaults to MySQL.

## Environment Variables

Create a `.env` file. Here's what you need:

```env
NODE_ENV=development
PORT=8000

# Database - MySQL by default, set DB_DIALECT=postgres for PostgreSQL
DB_DIALECT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_NAME=sandbox_db

# JWT - change the secret!
JWT_SECRET=your-secret-key-change-in-production
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```

The rest have defaults, but you can override them if needed.

## Common Commands

```bash
npm run dev              # Start with Docker (easiest)
npm run dev:standalone   # Start without Docker (needs local DB running)
npm run db:setup         # Run migrations + seed data
npm run fresh            # Nuclear option - drops everything and starts fresh
npm run docker:up        # Start Docker services
npm run docker:down      # Stop Docker services
```

## API Docs

Once it's running:
- Swagger UI: http://localhost:8000/api-docs
- Postman collection: `postman/sandbox.postman_collection.json` (import it, set `baseUrl` variable)

Test accounts (from seeders):
- `demo@example.com` / `demo123`
- `admin@example.com` / `Password123!`

## Project Structure

Pretty standard NestJS structure:

```
src/
├── common/          # Shared utilities (guards, filters, interceptors, mappers)
├── config/          # App config
├── database/        # Sequelize models, migrations, seeders
└── modules/         # Feature modules (auth, user, product, student, teacher, course, department)
```

Each module follows the same pattern: controller → service → repository → mapper. Keeps things consistent.

## Testing

There are shell scripts in the root for testing endpoints. They're basic but work:

```bash
./test-all-endpoints.sh
./test-auth.sh
./test-product.sh
# etc...
```

## Documentation

I wrote up a couple guides:

- **[Sequelize Associations Guide](./scripts/SEQUELIZE_ASSOCIATIONS_GUIDE.md)** - Everything about Sequelize relationships. Got tired of looking this up, so I documented it all.
- **[Response Handling Explained](./scripts/RESPONSE_HANDLING_EXPLAINED.md)** - How the mappers work and why we don't use `@Res()`. Someone asked about this, so I wrote it down.

## Tech Stack

NestJS 11, TypeScript, Sequelize, MySQL/PostgreSQL, Redis (for queues), JWT auth, Swagger docs.

## Troubleshooting

**Database connection issues?**
```bash
npm run check:services  # Checks if Docker services are up
docker-compose logs mysql  # Check what's happening
```

**Want to start completely fresh?**
```bash
npm run fresh  # Drops DB, recreates, migrates, seeds
```

**Port 8000 already in use?**
Change `PORT` in `.env` or kill whatever's using it: `lsof -ti:8000 | xargs kill -9`

## Why This Exists

This is my sandbox project. I use it to:
- Try out new patterns before using them in real projects
- Reference when I forget how to do something
- Show examples of clean architecture, response mappers, complex Sequelize queries, transactions, etc.

Feel free to use it the same way. The code shows how I structure things - mappers instead of `@Res()`, proper separation of concerns, that kind of stuff.
