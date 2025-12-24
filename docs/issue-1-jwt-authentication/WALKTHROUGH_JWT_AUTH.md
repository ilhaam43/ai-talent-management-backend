# Candidate JWT Authentication - Implementation Walkthrough

This document provides a complete walkthrough of the JWT authentication implementation for candidates in the AI Talent Management Backend.

## 📋 Overview

I have implemented a complete JWT authentication system for candidates with the following features:

1. **Email/Password Authentication** - Local strategy for login
2. **JWT Access Tokens** - Short-lived tokens (15 minutes) for API access
3. **Refresh Tokens** - Long-lived tokens (7 days) in httpOnly cookies
4. **Protected Routes** - JWT guards for securing API endpoints
5. **Secure Password Storage** - bcrypt hashing

This implementation follows industry best practices for stateless authentication with refresh token pattern.

## 🗄️ Database Changes

### Schema Updates

Added `Candidate` model to `prisma/schema.prisma`:

```prisma
model Candidate {
  id        String   @id @default(uuid())
  email     String?  // Legacy authentication field
  password  String?  // Legacy authentication field (hashed with bcrypt)
  name      String?  // Legacy authentication field
  // ... other ERD schema fields
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("candidates")
}
```

**Note**: The Candidate model includes additional fields from the ERD schema for candidate profiles. Authentication uses the `email` and `password` fields.

### Migration

```bash
npx prisma migrate dev --name add_candidate_auth
```

This creates the `candidates` table in the database.

## 📦 Dependencies Installed

```bash
npm install @nestjs/passport @nestjs/jwt passport passport-local passport-jwt bcrypt cookie-parser
npm install -D @types/passport-local @types/passport-jwt @types/bcrypt @types/cookie-parser
```

**Key Dependencies**:
- **@nestjs/passport**: Passport.js integration for NestJS
- **@nestjs/jwt**: JWT token handling
- **passport-local**: Local authentication strategy (email/password)
- **passport-jwt**: JWT authentication strategy
- **bcrypt**: Password hashing
- **cookie-parser**: Cookie parsing middleware

## 🏗️ Module Structure

### 1. Candidates Module

**Location**: `src/candidates/`

**Files Created**:
- `candidates.module.ts` - Module definition
- `candidates.service.ts` - Business logic for candidate operations

**Key Features**:
- `findOne(email)`: Find candidate by email
- `create(data)`: Create candidate with password hashing
- Password hashing using bcrypt (salt rounds: 10)

**Example Usage**:
```typescript
// Find candidate
const candidate = await candidatesService.findOne('test@example.com');

// Create candidate
const newCandidate = await candidatesService.create({
  email: 'test@example.com',
  password: 'password123', // Will be hashed automatically
  name: 'Test Candidate',
});
```

### 2. Auth Module

**Location**: `src/auth/`

**Files Created/Modified**:
- `auth.module.ts` - Module definition with JWT configuration
- `auth.service.ts` - Authentication business logic
- `auth.controller.ts` - Authentication endpoints
- `local.strategy.ts` - Local authentication strategy
- `jwt.strategy.ts` - JWT authentication strategy

**Key Features**:
- Email/password validation
- JWT token generation
- Refresh token handling
- User validation from tokens

## 🔐 Authentication Flow

### Login Flow

```
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │
       │ POST /auth/login
       │ { email, password }
       ▼
┌─────────────────────┐
│  AuthController    │
│  @UseGuards(Local) │
└──────┬──────────────┘
       │
       │ LocalStrategy.validate()
       ▼
┌─────────────────────┐
│  AuthService        │
│  validateUser()     │
└──────┬──────────────┘
       │
       │ CandidatesService.findOne()
       │ bcrypt.compare()
       ▼
┌─────────────────────┐
│  AuthService        │
│  login()            │
│  - Generate tokens  │
└──────┬──────────────┘
       │
       │ Returns: { access_token, expires_in }
       │ Sets: refresh_token cookie
       ▼
┌─────────────┐
│  Frontend   │
│  - Store   │
│    token   │
└────────────┘
```

### Protected Route Flow

```
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │
       │ GET /auth/profile
       │ Authorization: Bearer <token>
       ▼
┌─────────────────────┐
│  AuthController    │
│  @UseGuards(JWT)   │
└──────┬──────────────┘
       │
       │ JwtStrategy.validate()
       │ - Extract token
       │ - Verify signature
       │ - Check expiry
       ▼
┌─────────────────────┐
│  Route Handler     │
│  - Access req.user │
└─────────────────────┘
```

### Refresh Token Flow

```
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │
       │ POST /auth/refresh
       │ (cookie sent automatically)
       ▼
┌─────────────────────┐
│  AuthController    │
│  refresh()          │
└──────┬──────────────┘
       │
       │ Extract cookie
       │ req.cookies.refresh_token
       ▼
┌─────────────────────┐
│  AuthService        │
│  refreshAccessToken()│
│  - Verify token     │
│  - Generate new     │
└──────┬──────────────┘
       │
       │ Returns: { access_token, expires_in }
       ▼
┌─────────────┐
│  Frontend   │
│  - Update  │
│    token   │
└────────────┘
```

## 🔧 Configuration

### Environment Variables

Create or update `.env` file:

```env
# JWT Configuration
JWT_SECRET=your-secret-key-here-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-here  # Optional, defaults to JWT_SECRET

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3001

# Node Environment
NODE_ENV=development  # or production
```

### JWT Configuration

Configured in `src/auth/auth.module.ts`:

```typescript
JwtModule.registerAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    secret: configService.get<string>('JWT_SECRET') || 'supersecretjwt',
    signOptions: { expiresIn: '15m' } // Access token: 15 minutes
  }),
  inject: [ConfigService]
})
```

### CORS Configuration

Configured in `src/main.ts`:

```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true, // Allow cookies
})
```

### Cookie Configuration

Refresh tokens are set with secure flags:

```typescript
res.cookie('refresh_token', tokens.refresh_token, {
  httpOnly: true,        // Prevents XSS
  secure: isProduction,  // HTTPS only in production
  sameSite: 'strict',    // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
})
```

## 📡 API Endpoints

### 1. Login

**POST** `/auth/login`

**Request Body**:
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 900
}
```

**Cookie Set**:
```
Set-Cookie: refresh_token=eyJhbGci...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

**Example (cURL)**:
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt
```

### 2. Refresh Token

**POST** `/auth/refresh`

**Request**: No body needed (cookie automatically sent)

**Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 900
}
```

**Example (cURL)**:
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

### 3. Logout

**POST** `/auth/logout`

**Request**: No body needed

**Response**:
```json
{
  "message": "Logout successful"
}
```

**Cookie Cleared**: Refresh token cookie is removed

**Example (cURL)**:
```bash
curl -X POST http://localhost:3000/auth/logout \
  -b cookies.txt
```

### 4. Get Profile

**GET** `/auth/profile`

**Request Headers**:
```
Authorization: Bearer <access_token>
```

**Response**:
```json
{
  "id": "a1b057e9-8808-469c-855d-133751e06ef4",
  "email": "test@example.com",
  "userId": "a1b057e9-8808-469c-855d-133751e06ef4"
}
```

**Example (cURL)**:
```bash
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer <access_token>"
```

## 🧪 Testing

### Seed Test Candidate

**File**: `scripts/seed-candidate.ts`

Creates a test candidate with:
- Email: `test@example.com`
- Password: `password123` (hashed)

**Run**:
```bash
npx ts-node scripts/seed-candidate.ts
```

### Test Authentication

**File**: `scripts/test-auth.ts`

Tests:
1. Login with correct credentials
2. Verify token is returned
3. Access protected route with token

**Run**:
```bash
npx ts-node scripts/test-auth.ts
```

**Expected Output**:
```
1. Attempting login with correct credentials...
STATUS: 201
SUCCESS: Login successful. Token: Received
```

### Test Refresh Token

**File**: `scripts/test-refresh-token.ts`

Tests complete refresh token flow:
1. Login
2. Use access token
3. Refresh token
4. Use new access token
5. Logout
6. Verify refresh fails after logout

**Run**:
```bash
npx ts-node scripts/test-refresh-token.ts
```

## 🚀 Getting Started

### Prerequisites
1. Docker (for PostgreSQL)
2. Node.js 18+
3. npm or yarn

### Setup Steps

1. **Start Database**:
```bash
docker compose up -d db
```

2. **Run Migration**:
```bash
npx prisma migrate dev
```

3. **Seed Test Candidate**:
```bash
npx ts-node scripts/seed-candidate.ts
```

4. **Start Server**:
```bash
npm run start:dev
```

5. **Test Authentication**:
```bash
# In another terminal
npx ts-node scripts/test-auth.ts
```

### Swagger Documentation

Access interactive API documentation at:
```
http://localhost:3000/docs
```

Use the "Authorize" button to add your JWT token for testing protected endpoints.

## 🔒 Security Features

### Password Security
- ✅ Passwords hashed with bcrypt (salt rounds: 10)
- ✅ Passwords never returned in API responses
- ✅ Secure password comparison using bcrypt.compare

### Token Security
- ✅ Access tokens short-lived (15 minutes)
- ✅ Refresh tokens in httpOnly cookies (prevents XSS)
- ✅ Secure flag in production (HTTPS only)
- ✅ SameSite: strict (CSRF protection)
- ✅ Separate secrets for access and refresh tokens (optional)

### CORS Security
- ✅ Specific origin allowed (not *)
- ✅ Credentials: true for cookie support
- ✅ Configurable via environment variable

## 📊 Token Structure

### Access Token Payload
```json
{
  "email": "test@example.com",
  "sub": "a1b057e9-8808-469c-855d-133751e06ef4",
  "type": "access",
  "iat": 1234567890,
  "exp": 1234568790
}
```

### Refresh Token Payload
```json
{
  "sub": "a1b057e9-8808-469c-855d-133751e06ef4",
  "type": "refresh",
  "iat": 1234567890,
  "exp": 1235232690
}
```

## 🔄 Frontend Integration

### Login
```typescript
const response = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Important: include cookies
  body: JSON.stringify({ email, password }),
});

const { access_token, expires_in } = await response.json();
// Store access token in memory
let accessToken = access_token;
let tokenExpiry = Date.now() + expires_in * 1000;
```

### Auto-Refresh
```typescript
async function getAccessToken() {
  // If token expires in less than 5 minutes, refresh it
  if (Date.now() > tokenExpiry - 5 * 60 * 1000) {
    await refreshToken();
  }
  return accessToken;
}

async function refreshToken() {
  const response = await fetch('http://localhost:3000/auth/refresh', {
    method: 'POST',
    credentials: 'include', // Important: send cookies
  });

  if (response.ok) {
    const { access_token, expires_in } = await response.json();
    accessToken = access_token;
    tokenExpiry = Date.now() + expires_in * 1000;
  } else {
    // Refresh token expired, redirect to login
    window.location.href = '/login';
  }
}
```

### API Calls
```typescript
async function apiCall(url: string) {
  const token = await getAccessToken();
  return fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  });
}
```

## 🐛 Troubleshooting

### Database Connection Error
```
Error: P1001: Can't reach database server
```
**Solution**: Start Docker database with `docker compose up -d db`

### Login Fails
```
Error: 401 Unauthorized
```
**Solution**: 
- Check if candidate exists: `npx ts-node scripts/seed-candidate.ts`
- Verify email and password are correct
- Check password hashing in database

### Token Invalid
```
Error: jwt expired
```
**Solution**: 
- Token has expired (15 minutes)
- Use refresh token to get new access token
- Or login again

### Cookie Not Sent
```
Error: Refresh token not found
```
**Solution**:
- Ensure `credentials: 'include'` in fetch requests
- Check CORS `credentials: true` in backend
- Verify cookie domain/path settings

### CORS Error
```
Error: CORS policy blocked
```
**Solution**:
- Ensure `FRONTEND_URL` matches your frontend
- Check `credentials: true` in CORS config
- Verify origin is allowed

## 📈 Performance Considerations

1. **Stateless Authentication**: No database lookup per request (fast)
2. **Token Validation**: JWT signature verification (O(1))
3. **Password Hashing**: bcrypt is intentionally slow (security)
4. **Cookie Parsing**: Minimal overhead

## 🔮 Future Enhancements

1. **Token Rotation**: Rotate refresh tokens on each use
2. **Token Revocation**: Store refresh tokens in database for revocation
3. **Rate Limiting**: Add rate limiting to login endpoint
4. **2FA**: Add two-factor authentication
5. **OAuth**: Add social login (Google, LinkedIn, etc.)
6. **Session Management**: Track active sessions

## ✅ Success Criteria

All implemented successfully:
- ✅ Candidate can login with email and password
- ✅ JWT access token is returned on successful login
- ✅ Refresh token is set in httpOnly cookie
- ✅ Protected routes require valid JWT token
- ✅ Token refresh works correctly
- ✅ Logout clears refresh token
- ✅ Passwords are hashed with bcrypt
- ✅ CORS configured for frontend
- ✅ Swagger documentation includes Bearer Auth
- ✅ Test scripts work correctly

## 📚 Related Documentation

- [Implementation Plan](./IMPLEMENTATION_PLAN_JWT_AUTH.md)
- [JWT Best Practices](../JWT_BEST_PRACTICES.md)
- [Refresh Token Implementation](../REFRESH_TOKEN_IMPLEMENTATION.md)
- [Main Documentation](../README.md)

## 🤝 Contributing

When extending this implementation:
1. Follow the existing module structure
2. Add tests for new features
3. Update Swagger documentation
4. Update this walkthrough document

---

**Implementation Date**: December 2025  
**Issue**: #1 - Implement JWT authentication for candidates  
**Status**: ✅ Complete


