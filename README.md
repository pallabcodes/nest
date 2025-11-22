# NestJS SaaS Boilerplate

A minimal, interview-ready NestJS boilerplate with authentication and user management. Perfect for SaaS applications.

## 🚀 Quick Start

```bash
npm install
npm run docker:up      # Start MySQL + Redis
npm run db:setup       # Run migrations + seed data
npm run dev            # Start development server
```

API will be available at `http://localhost:8000/api`

## 📁 What's Included

- **Auth Module**: JWT authentication, OTP verification, password reset
- **User Module**: User CRUD operations with role-based access
- **Database**: Sequelize ORM with MySQL (PostgreSQL supported)
- **Guards**: Placeholder files (implement during interview)
- **3-Layer Architecture**: Controller → Service → Repository

## 🎯 Boilerplate Philosophy

- **Infrastructure First**: All setup code is written and working
- **Business Logic**: Services/repositories have TODO comments (not implemented)
- **Guards**: Placeholder `.md` files - implement during interview
- **Clean Base**: Remove boilerplate comments with `npm run remove:boilerplate`

## 🔧 Environment Setup

Create `.env` file:

```env
NODE_ENV=development
PORT=8000

# Database
DB_DIALECT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_NAME=boilerplate_db

# JWT
JWT_SECRET=your-secret-change-in-production
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```

## 📝 Implementation Guide

1. **Guards**: Implement `JwtAuthGuard` and `RolesGuard` in placeholder files
2. **Services**: Replace TODO comments with actual implementations
3. **Features**: Add new modules using `npm run generate:module`
4. **Cleanup**: Run `npm run remove:boilerplate` to remove TODO comments

## 🏗️ Architecture

```
Controller → Service → Repository → Database
    ↓         ↓         ↓
   HTTP    Business   Data Access
 Response   Logic      Layer
```

## 🛠️ Available Scripts

```bash
npm run dev              # Start with Docker
npm run dev:standalone   # Start without Docker
npm run db:setup         # Run migrations + seeds
npm run remove:boilerplate # Remove TODO comments
npm run generate:module  # Create new module
```

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
