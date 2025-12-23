# Docker Deployment Guide

## 🐳 Docker Compose Setup

This project uses Docker Compose for simplified deployment and scalability. Each service runs in its own container.

## 📦 Services

### 1. Database Service (`db`)
- **Image**: `postgres:15-alpine`
- **Port**: 5432
- **Container Name**: `ai-talent-db`
- **Purpose**: PostgreSQL database for application data

### 2. Application Service (`app`)
- **Image**: `node:20-alpine`
- **Port**: 3000
- **Container Name**: `ai-talent-app`
- **Purpose**: NestJS backend application

### 3. Volumes
- **pgdata**: Persistent PostgreSQL data
- **uploads**: Persistent uploaded CV files

### 4. Network
- **ai-talent-network**: Bridge network for service communication

## 🚀 Quick Start

### Start All Services
```bash
docker compose up -d
```

This will:
1. Start PostgreSQL database
2. Wait for database to be healthy
3. Start the application
4. Install dependencies
5. Run migrations
6. Start the server on port 3000

### Start Only Database
```bash
docker compose up -d db
```

### Start Only Application
```bash
docker compose up -d app
```

### View Logs
```bash
# All services
docker compose logs -f

# Database only
docker compose logs -f db

# Application only
docker compose logs -f app
```

### Stop Services
```bash
docker compose down
```

### Stop and Remove Volumes (⚠️ This deletes all data)
```bash
docker compose down -v
```

## 🔧 Development Workflow

### Option 1: Full Docker (Recommended for Production-like Environment)
```bash
# Start all services
docker compose up -d

# Access application at http://localhost:3000
# Access Swagger at http://localhost:3000/docs
```

### Option 2: Database in Docker, App Locally (Recommended for Development)
```bash
# Start only database
docker compose up -d db

# Run app locally
npm install
npm run build
npm start
```

### Option 3: Everything Locally
```bash
# Install and run PostgreSQL locally
# Update .env with local database URL
npm install
npm run build
npm start
```

## 📝 Environment Variables

Environment variables are configured in `docker-compose.yaml`:

```yaml
environment:
  DATABASE_URL: postgresql://postgres:postgres@db:5432/ai_talent_db?schema=public
  JWT_SECRET: supersecretjwt
  PORT: 3000
  NODE_ENV: development
```

**For production**, create a `.env` file or use Docker secrets:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-very-secure-secret-key
PORT=3000
NODE_ENV=production
```

## 🔄 Database Migrations

### Auto-run on Container Start
Migrations run automatically when the app container starts:
```bash
docker compose up -d
```

### Manual Migration
```bash
# Access the app container
docker compose exec app sh

# Run migration
npx prisma migrate dev

# Or deploy migration
npx prisma migrate deploy
```

## 📊 Seed Data

### Seed Document Types
```bash
docker compose exec app npx ts-node scripts/seed-document-types.ts
```

### Seed Test Candidate
```bash
docker compose exec app npx ts-node scripts/seed-candidate.ts
```

## 🧪 Testing

### Run Tests Inside Container
```bash
docker compose exec app npx ts-node scripts/test-cv-upload-and-parse.ts
```

### Access Swagger UI
Open browser: http://localhost:3000/docs

## 🛠️ Troubleshooting

### Container Won't Start
```bash
# Check logs
docker compose logs app

# Check if port 3000 is already in use
netstat -ano | findstr :3000  # Windows
lsof -i :3000                  # Mac/Linux

# Restart services
docker compose restart
```

### Database Connection Error
```bash
# Check if database is running
docker compose ps

# Check database logs
docker compose logs db

# Ensure database is healthy
docker compose exec db pg_isready -U postgres
```

### Migration Fails
```bash
# Access container
docker compose exec app sh

# Check Prisma status
npx prisma migrate status

# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Or manually run migration
npx prisma migrate dev
```

### Uploaded Files Not Persisting
The `uploads` volume ensures files persist across container restarts. To check:

```bash
# List volumes
docker volume ls

# Inspect uploads volume
docker volume inspect ai-talent-management-backend_uploads

# Access files inside container
docker compose exec app ls -la /usr/src/app/uploads/documents
```

### Port Already in Use
```bash
# Find process using port 3000
netstat -ano | findstr :3000  # Windows
lsof -i :3000                  # Mac/Linux

# Kill the process or change port in docker-compose.yaml
ports:
  - "3001:3000"  # Host port 3001 -> Container port 3000
```

## 🔒 Security Considerations

### For Production:

1. **Change Default Credentials**
   ```yaml
   environment:
     POSTGRES_USER: your_user
     POSTGRES_PASSWORD: your_secure_password
     POSTGRES_DB: your_database
   ```

2. **Use Docker Secrets**
   ```yaml
   secrets:
     postgres_password:
       external: true
     jwt_secret:
       external: true
   ```

3. **Don't Expose Database Port**
   Remove `ports: - "5432:5432"` from db service

4. **Use Environment-Specific Config**
   - `.env.development`
   - `.env.production`

5. **Enable HTTPS**
   Add a reverse proxy like Nginx or Traefik

## 📈 Scaling

### Scale Application Instances
```bash
# Run 3 instances of the app
docker compose up -d --scale app=3
```

**Note**: You'll need a load balancer (Nginx, Traefik) to distribute traffic.

### Production Deployment
For production, consider:
- **Docker Swarm** for orchestration
- **Kubernetes** for advanced orchestration
- **Cloud Services**: AWS ECS, Google Cloud Run, Azure Container Instances

## 🔍 Monitoring

### Health Checks
Both services have health checks configured:

```bash
# Check health status
docker compose ps

# View health check logs
docker inspect --format='{{json .State.Health}}' ai-talent-app
```

### Resource Usage
```bash
# View resource usage
docker stats

# Or specific container
docker stats ai-talent-app
```

## 🎯 Best Practices

1. **Always use volumes** for persistent data (database, uploads)
2. **Use health checks** to ensure services are ready
3. **Network isolation** - services communicate via docker network
4. **Container naming** - use consistent names for easy management
5. **Resource limits** - set CPU and memory limits for production
6. **Logging** - configure proper log drivers for production

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [NestJS Docker Deployment](https://docs.nestjs.com/recipes/docker)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)

## 🆘 Common Commands Reference

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# Restart services
docker compose restart

# View logs
docker compose logs -f

# Execute command in container
docker compose exec app sh
docker compose exec db psql -U postgres -d ai_talent_db

# Rebuild containers (after code changes)
docker compose up -d --build

# Remove all (⚠️ including volumes)
docker compose down -v

# Check service status
docker compose ps

# View resource usage
docker stats
```

---

**Last Updated**: December 5, 2025  
**Docker Compose Version**: 2.x  
**Status**: ✅ Production Ready


