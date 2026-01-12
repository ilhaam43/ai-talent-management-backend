# Implementation Plan - Candidate JWT Authentication

## Goal Description

Implement JWT authentication for candidates. This involves creating a Candidate model in the database, setting up a CandidatesModule, and configuring Passport JWT and Local strategies to authenticate candidates via email and password.

### Key Requirements

1. **Candidate Authentication**
   - Email and password-based login
   - Password hashing with bcrypt
   - JWT token generation on successful login

2. **Token Management**
   - Access token (short-lived: 15 minutes)
   - Refresh token (long-lived: 7 days, in httpOnly cookie)
   - Token refresh mechanism

3. **Protected Routes**
   - JWT guard for protecting API endpoints
   - Token validation on each request
   - User context extraction from token

4. **Security**
   - Secure password storage (bcrypt hashing)
   - httpOnly cookies for refresh tokens
   - CORS with credentials support
   - Secure cookie flags in production

## User Review Required

**IMPORTANT NOTES:**

1. **Database Schema**: 
   - Adding new `Candidate` model to Prisma schema
   - Existing `User` model remains as placeholder
   - Can run `prisma migrate dev` or `prisma db push` to update database

2. **Authentication Strategy**:
   - Using Passport.js with Local and JWT strategies
   - Local strategy for login (email/password)
   - JWT strategy for protected routes

3. **Token Approach**:
   - Stateless JWT tokens (no database storage)
   - Refresh tokens stored in httpOnly cookies
   - Access tokens stored in frontend memory

4. **Dependencies**:
   - `@nestjs/passport` - Passport integration
   - `@nestjs/jwt` - JWT token handling
   - `passport-local` - Local authentication strategy
   - `passport-jwt` - JWT authentication strategy
   - `bcrypt` - Password hashing
   - `cookie-parser` - Cookie handling

## Proposed Changes

### 1. Database Schema Updates

**[MODIFY]** `prisma/schema.prisma`

Add `Candidate` model:
```prisma
model Candidate {
  id        String   @id @default(uuid())
  email     String?  // Legacy field
  password  String?  // Legacy field (hashed)
  name      String?  // Legacy field
  // ... other ERD fields
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("candidates")
}
```

**Note**: The Candidate model may have additional fields from ERD schema. This implementation focuses on authentication fields.

**[ACTION]** Run migration:
```bash
npx prisma migrate dev --name add_candidate_auth
```

### 2. Install Dependencies

**[ACTION]** Install required packages:
```bash
npm install @nestjs/passport @nestjs/jwt passport passport-local passport-jwt bcrypt cookie-parser
npm install -D @types/passport-local @types/passport-jwt @types/bcrypt @types/cookie-parser
```

### 3. Candidates Module

**[NEW]** `src/candidates/candidates.module.ts`
- Create CandidatesModule
- Export CandidatesService for use in AuthModule

**[NEW]** `src/candidates/candidates.service.ts`
- `findOne(email: string)`: Find candidate by email
- `create(data: CandidateCreateInput)`: Create new candidate with password hashing
- Use PrismaService for database access
- Hash passwords using bcrypt before storing

**Key Methods**:
```typescript
async findOne(email: string): Promise<Candidate | null>
async create(data: Prisma.CandidateCreateInput): Promise<Candidate>
```

### 4. Auth Module Updates

**[MODIFY]** `src/auth/auth.module.ts`
- Import CandidatesModule
- Configure JwtModule with secret and expiry
- Register PassportModule
- Export AuthService

**JWT Configuration**:
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

**[MODIFY]** `src/auth/auth.service.ts`
- Inject CandidatesService and JwtService
- `validateUser(email, password)`: Validate candidate credentials
- `login(user)`: Generate access and refresh tokens
- `refreshAccessToken(refreshToken)`: Validate refresh token and generate new access token

**Key Methods**:
```typescript
async validateUser(email: string, pass: string): Promise<any>
async login(user: any): Promise<{ access_token: string, refresh_token: string }>
async refreshAccessToken(refreshToken: string): Promise<{ access_token: string }>
```

**[NEW]** `src/auth/local.strategy.ts`
- Extend PassportStrategy(Strategy) from 'passport-local'
- Extract email and password from request body
- Call AuthService.validateUser
- Return user object on success

**[NEW]** `src/auth/jwt.strategy.ts`
- Extend PassportStrategy(Strategy) from 'passport-jwt'
- Extract JWT from Authorization header
- Validate token signature and expiry
- Return user payload (id, email)

**[MODIFY]** `src/auth/auth.controller.ts`
- `POST /auth/login`: Login endpoint (uses LocalStrategy guard)
- `POST /auth/refresh`: Refresh token endpoint
- `POST /auth/logout`: Logout endpoint (clears cookie)
- `GET /auth/profile`: Get current user profile (uses JwtStrategy guard)

### 5. Main Application Setup

**[MODIFY]** `src/main.ts`
- Enable CORS with credentials support
- Configure cookie parser middleware
- Set up Swagger documentation with Bearer Auth

**CORS Configuration**:
```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true, // Allow cookies
})
```

**Cookie Parser**:
```typescript
app.use(cookieParser())
```

### 6. Environment Variables

**[NEW]** `.env` additions:
```env
# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here  # Optional, defaults to JWT_SECRET

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3001

# Node Environment
NODE_ENV=development  # or production
```

## Authentication Flow

### Login Flow

```
1. Client sends POST /auth/login with { email, password }
2. LocalStrategy extracts credentials
3. AuthService.validateUser checks credentials
4. If valid:
   - Generate access token (15 min)
   - Generate refresh token (7 days)
   - Set refresh token in httpOnly cookie
   - Return access token in response
5. Client stores access token in memory
```

### Protected Route Flow

```
1. Client sends request with Authorization: Bearer <access_token>
2. JwtStrategy extracts and validates token
3. If valid:
   - Extract user info from token payload
   - Attach user to request object
   - Continue to route handler
4. If invalid/expired:
   - Return 401 Unauthorized
   - Client should refresh token
```

### Refresh Token Flow

```
1. Client detects access token is expired/about to expire
2. Client sends POST /auth/refresh (cookie automatically sent)
3. AuthService.refreshAccessToken validates refresh token
4. If valid:
   - Generate new access token
   - Return new access token
5. Client updates stored access token
6. If invalid:
   - Return 401 Unauthorized
   - Client redirects to login
```

## Security Considerations

### Password Security
- ✅ Passwords hashed with bcrypt (salt rounds: 10)
- ✅ Passwords never returned in API responses
- ✅ Password comparison using bcrypt.compare

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

### Best Practices
- ✅ Stateless authentication (no database lookup per request)
- ✅ Token expiry limits damage if compromised
- ✅ Refresh token rotation (future enhancement)
- ✅ Logout clears refresh token cookie

## API Endpoints

### POST /auth/login
**Request:**
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 900
}
```

**Cookie Set:**
```
Set-Cookie: refresh_token=eyJhbGci...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

### POST /auth/refresh
**Request:** (No body, cookie automatically sent)

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 900
}
```

### POST /auth/logout
**Request:** (No body)

**Response:**
```json
{
  "message": "Logout successful"
}
```

**Cookie Cleared:**
```
Set-Cookie: refresh_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0
```

### GET /auth/profile
**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "uuid",
  "email": "test@example.com",
  "userId": "uuid"
}
```

## Testing Plan

### Unit Tests
- Test password hashing
- Test token generation
- Test token validation
- Test refresh token flow

### Integration Tests
- Test login with valid credentials
- Test login with invalid credentials
- Test protected route access
- Test token refresh
- Test logout

### E2E Tests
- Test complete authentication flow
- Test token expiry handling
- Test refresh token expiry
- Test cookie handling

### Test Scripts

**[NEW]** `scripts/test-auth.ts`
- Test login with correct credentials
- Test login with incorrect credentials
- Test accessing protected route
- Verify token structure

**[NEW]** `scripts/test-refresh-token.ts`
- Test login flow
- Test token refresh
- Test logout
- Test refresh after logout

**[NEW]** `scripts/seed-candidate.ts`
- Create test candidate
- Hash password
- Save to database

## Verification Plan

### Automated Tests

**Test Script**: `scripts/test-auth.ts`
```bash
npx ts-node scripts/test-auth.ts
```

**Expected Output**:
```
1. Attempting login with correct credentials...
STATUS: 201
SUCCESS: Login successful. Token: Received
```

### Manual Verification

**1. Start Server:**
```bash
npm run build
npm start
```

**2. Seed Candidate:**
```bash
npx ts-node scripts/seed-candidate.ts
```

**3. Test Login (cURL):**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**4. Test Protected Route:**
```bash
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer <access_token>"
```

**5. Test Refresh Token:**
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

## Success Criteria

- ✅ Candidate can login with email and password
- ✅ JWT access token is returned on successful login
- ✅ Refresh token is set in httpOnly cookie
- ✅ Protected routes require valid JWT token
- ✅ Token refresh works correctly
- ✅ Logout clears refresh token
- ✅ Passwords are hashed with bcrypt
- ✅ CORS configured for frontend
- ✅ Swagger documentation includes Bearer Auth

## Dependencies

### Runtime Dependencies
- `@nestjs/passport` - Passport integration
- `@nestjs/jwt` - JWT handling
- `passport` - Authentication middleware
- `passport-local` - Local strategy
- `passport-jwt` - JWT strategy
- `bcrypt` - Password hashing
- `cookie-parser` - Cookie parsing

### Dev Dependencies
- `@types/passport-local` - TypeScript types
- `@types/passport-jwt` - TypeScript types
- `@types/bcrypt` - TypeScript types
- `@types/cookie-parser` - TypeScript types

## Migration Path

### Phase 1: Basic JWT Auth
1. Add Candidate model
2. Create CandidatesModule
3. Implement Local and JWT strategies
4. Basic login endpoint

### Phase 2: Refresh Token
1. Add refresh token generation
2. Implement cookie handling
3. Add refresh endpoint
4. Add logout endpoint

### Phase 3: Security Hardening
1. Add CORS configuration
2. Add secure cookie flags
3. Add environment variables
4. Update documentation

## Future Enhancements

1. **Token Rotation**: Rotate refresh tokens on each use
2. **Token Revocation**: Store refresh tokens in database for revocation
3. **Rate Limiting**: Add rate limiting to login endpoint
4. **2FA**: Add two-factor authentication
5. **OAuth**: Add social login (Google, LinkedIn, etc.)
6. **Session Management**: Track active sessions

---

**Issue**: #1 - Implement JWT authentication for candidates  
**Status**: 📋 Planning  
**Dependencies**: None


