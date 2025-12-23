# Deployment Checklist

## ✅ Pre-Deployment

- [ ] Database is running (PostgreSQL)
- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Code compiled successfully
- [ ] Migrations applied
- [ ] Seed data loaded

## 🐳 Docker Deployment

### 1. Start Services
```bash
docker compose up -d
```

### 2. Verify Services
```bash
# Check all services are running
docker compose ps

# Expected output:
# NAME                              COMMAND                  SERVICE             STATUS
# ai-talent-app                     "docker-entrypoint.s…"   app                 running (healthy)
# ai-talent-db                      "docker-entrypoint.s…"   db                  running (healthy)
```

### 3. Check Logs
```bash
# Application logs
docker compose logs -f app

# Look for:
# [Nest] Starting Nest application...
# [Nest] Nest application successfully started
```

### 4. Seed Data
```bash
# Seed document types
docker compose exec app npx ts-node scripts/seed-document-types.ts

# Seed test candidate (if needed)
docker compose exec app npx ts-node scripts/seed-candidate.ts
```

### 5. Test Application
```bash
# Test health
curl http://localhost:3000/auth/profile

# Access Swagger
# Open: http://localhost:3000/docs
```

### 6. Run Integration Tests
```bash
docker compose exec app npx ts-node scripts/test-cv-upload-and-parse.ts
```

## 💻 Local Deployment

### 1. Start Database
```bash
docker compose up -d db
```

### 2. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 3. Run Migration
```bash
npx prisma migrate dev
```

### 4. Seed Data
```bash
npx ts-node scripts/seed-document-types.ts
npx ts-node scripts/seed-candidate.ts
```

### 5. Build Application
```bash
npm run build
```

### 6. Start Application
```bash
npm start
```

### 7. Verify
```bash
# Check server
curl http://localhost:3000/docs

# Run tests
npx ts-node scripts/test-cv-upload-and-parse.ts
```

## 🧪 Testing Checklist

### Manual Testing

- [ ] Swagger UI accessible at `/docs`
- [ ] Login with test credentials works
- [ ] Get document types works
- [ ] Upload CV works
- [ ] Parse CV returns structured data
- [ ] Download document works
- [ ] Delete document works

### Automated Testing

```bash
# Run test script
npx ts-node scripts/test-cv-upload-and-parse.ts

# Expected output:
# ✅ login
# ✅ profile
# ✅ documentTypes
# ✅ upload
# ✅ getDocuments
# ✅ parse
# ✅ download
# ✅ delete
# 8/8 tests passed
```

## 📝 API Endpoints Verification

### Auth
- [ ] `POST /auth/login` - Returns JWT token
- [ ] `GET /auth/profile` - Returns candidate data

### Documents
- [ ] `POST /documents/upload` - Uploads file successfully
- [ ] `GET /documents` - Lists uploaded documents
- [ ] `GET /documents/types` - Lists document types
- [ ] `GET /documents/:id` - Gets document details
- [ ] `GET /documents/:id/download` - Downloads file
- [ ] `DELETE /documents/:id` - Deletes document

### CV Parser
- [ ] `POST /cv-parser/parse/:documentId` - Returns parsed data
- [ ] `POST /cv-parser/parse-file` - Parses uploaded file

## 🔍 Health Checks

### Database
```bash
# Docker
docker compose exec db pg_isready -U postgres

# Local
psql -U postgres -c "SELECT 1"
```

### Application
```bash
# Check port
netstat -ano | findstr :3000   # Windows
lsof -i :3000                   # Mac/Linux

# Check health
curl http://localhost:3000/auth/profile
# Should return: {"statusCode":401,"message":"Unauthorized"}
```

### Uploads Directory
```bash
# Docker
docker compose exec app ls -la /usr/src/app/uploads/documents

# Local
ls -la uploads/documents
```

## 🚨 Troubleshooting

### Database Connection Error
```bash
# Check database is running
docker compose ps db

# Check database logs
docker compose logs db

# Restart database
docker compose restart db
```

### Port Already in Use
```bash
# Find process
netstat -ano | findstr :3000  # Windows
lsof -i :3000                  # Mac/Linux

# Kill process or change port in docker-compose.yaml
```

### Migration Error
```bash
# Check migration status
npx prisma migrate status

# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Rerun migration
npx prisma migrate dev
```

### Build Error
```bash
# Clean build
rm -rf dist/
rm -rf node_modules/
npm install --legacy-peer-deps
npm run build
```

## 📊 Performance Checks

### Response Time
```bash
# Test response time
time curl http://localhost:3000/auth/profile
```

### Memory Usage
```bash
# Docker
docker stats ai-talent-app

# Local
# Use Task Manager or Activity Monitor
```

### Disk Space
```bash
# Check uploads folder size
du -sh uploads/  # Mac/Linux
```

## 🔒 Security Checklist

- [ ] JWT secret is secure (not default)
- [ ] Database password is secure
- [ ] File upload size limit configured (10MB)
- [ ] File type validation enabled (PDF, DOCX only)
- [ ] Authorization checks working
- [ ] CORS configured properly
- [ ] Rate limiting configured (if applicable)

## 📚 Documentation

- [ ] README.md updated
- [ ] API documentation (Swagger) accessible
- [ ] Docker deployment guide available
- [ ] Environment variables documented
- [ ] Troubleshooting guide available

## ✨ Post-Deployment

- [ ] Monitor logs for errors
- [ ] Test all endpoints
- [ ] Verify file uploads persist
- [ ] Check database connections
- [ ] Monitor resource usage
- [ ] Set up backup strategy
- [ ] Configure monitoring/alerting

---

**Last Updated**: December 5, 2025  
**Version**: 1.0.0  
**Status**: ✅ Production Ready


