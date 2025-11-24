# AI Talent Management Backend

NestJS backend with a clean Controller → Service → Repository → Database architecture, Prisma ORM (PostgreSQL), Passport (Local + JWT), Swagger docs, and class-validator/class-transformer.

## Stack
- NestJS (Controllers, Providers, Modules)
- Prisma (PostgreSQL)
- Passport Local + JWT
- Swagger (`/docs`)
- class-validator + class-transformer

## Project Structure
```
src/
  auth/            # Local + JWT strategies and controller
  common/          # Shared interfaces (e.g., Repository<T>)
  database/        # PrismaService and DatabaseModule
  users/           # Users module (controller/service/repository/dto)
  app.module.ts    # App composition
  main.ts          # Bootstrap + ValidationPipe + Swagger
prisma/
  schema.prisma    # Prisma models (PostgreSQL)
```

## Environment
Create `.env` in project root:
```
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/ai_talent_db?schema=public"
JWT_SECRET="change-me"
```

## Install & Setup
```
npm install
npm run prisma:generate
npx prisma migrate dev --name init
```

## Run
```
# Development (ts-node-dev)
npm run start:dev

# Build & run
npm run build
node dist/main.js
```

App listens on `http://localhost:3000`.

## API Docs
- Swagger: `http://localhost:3000/docs`
- Use the Authorize button and paste `Bearer <jwt>` to call protected endpoints.

## Modules

### Users
- `POST /users` body `{ id, title, description }`
- `GET /users`
- `GET /users/:id`

### Auth
- `POST /auth/login` body `{ username, password }`
  - Returns: `{ access_token }`
- `GET /auth/profile` requires `Authorization: Bearer <jwt>`

## Architecture
1. Controller: receives request (`GET /users/:id`)
2. Service: validates, applies business rules
3. Repository: data access via Prisma
4. Database: Prisma client provider (`PrismaService`)

## Prisma
- Models are defined in `prisma/schema.prisma` (PostgreSQL datasource).
- Regenerate client after schema changes: `npm run prisma:generate`
- Create migrations: `npx prisma migrate dev --name <name>`

## Scaffolding
Generate a feature module that follows the architecture:
```
node scripts/generate-module.js <name>
```
This creates entity/repository/service/controller/module and auto-registers the module in `app.module.ts`.

## Configuration Notes
- Global validation is enabled (`ValidationPipe`) with whitelist and transform.
- JWT config is loaded from `JWT_SECRET`. Rotate for production.
- No global prefix; routes are mounted at root.

## Development Tips
- If switching databases/providers with Prisma, clear `prisma/migrations` and run a fresh `migrate dev`.
- Keep DTOs in `dto/` folders and annotate with `class-validator` and `@nestjs/swagger`.

## Database Tables
- Moved to `erd.md`
