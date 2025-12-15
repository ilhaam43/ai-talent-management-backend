# Issue #1: Candidate JWT Authentication

## 📋 Overview

Implementation of JWT authentication system for candidates, allowing secure login with email and password, and token-based access to protected API endpoints.

**Issue**: #1 - Implement JWT authentication for candidates  
**Status**: ✅ Complete  
**Implementation Date**: December 2025

## 📚 Documentation

### 1. [Implementation Plan](./IMPLEMENTATION_PLAN_JWT_AUTH.md)
Complete implementation plan with:
- Goal description
- Database schema changes
- Module structure
- Authentication flow
- Security considerations
- Testing plan

### 2. [Walkthrough](./WALKTHROUGH_JWT_AUTH.md)
Complete implementation walkthrough with:
- What was implemented
- Authentication workflow
- How to use
- Testing instructions
- Troubleshooting

## 🎯 What Was Implemented

### Authentication System
- **JWT-based authentication** with access tokens (15 minutes)
- **Refresh token mechanism** with httpOnly cookies (7 days)
- **Local strategy** for email/password validation
- **Password hashing** using bcrypt
- **Protected routes** with JWT guards

### API Endpoints
- `POST /auth/login` - Login and get access token + refresh token
- `POST /auth/refresh` - Refresh access token using refresh token
- `POST /auth/logout` - Logout and clear refresh token
- `GET /auth/profile` - Get current user profile (protected)

### Security Features
- ✅ Password hashing with bcrypt
- ✅ JWT tokens with short expiry (15 minutes)
- ✅ Refresh tokens in httpOnly cookies (7 days)
- ✅ Secure cookie flags (httpOnly, secure, sameSite)
- ✅ CORS with credentials support

## 🚀 Quick Start

```bash
# Start database
docker compose up -d db

# Run migration
npx prisma migrate dev

# Seed test candidate
npx ts-node scripts/seed-candidate.ts

# Start server
npm run start:dev

# Test authentication
npx ts-node scripts/test-auth.ts
```

## 📡 API Endpoints

### Authentication
- `POST /auth/login` - Login with email and password
  - Returns: `{ access_token, expires_in }`
  - Sets: `refresh_token` cookie (httpOnly)
- `POST /auth/refresh` - Refresh access token
  - Uses: `refresh_token` cookie
  - Returns: `{ access_token, expires_in }`
- `POST /auth/logout` - Logout and clear cookies
  - Returns: `{ message: "Logout successful" }`
- `GET /auth/profile` - Get current user profile
  - Requires: `Authorization: Bearer <access_token>`

## 🔐 Authentication Flow

```
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │
       │ 1. POST /auth/login
       │    { email, password }
       ▼
┌─────────────────────┐
│  Auth Controller    │
│  - Validate user    │
│  - Generate tokens  │
└──────┬──────────────┘
       │
       │ Returns: access_token
       │ Sets: refresh_token cookie
       │
┌──────▼──────┐
│  Frontend   │
│  - Store    │
│    access   │
│    token    │
└──────┬──────┘
       │
       │ 2. API Requests
       │    Authorization: Bearer <token>
       ▼
┌─────────────────────┐
│  Protected Routes   │
│  - JWT Guard        │
│  - Validate token   │
└──────┬──────────────┘
       │
       │ If token expired:
       │
┌──────▼──────┐
│  Frontend   │
└──────┬──────┘
       │
       │ 3. POST /auth/refresh
       │    (uses cookie)
       ▼
┌─────────────────────┐
│  Auth Controller    │
│  - Validate refresh │
│  - New access token │
└─────────────────────┘
```

## 🔗 Related Documentation

- [JWT Best Practices](../JWT_BEST_PRACTICES.md)
- [Refresh Token Implementation](../REFRESH_TOKEN_IMPLEMENTATION.md)
- [Main Documentation](../README.md)

## 📝 Notes

- **Access Token**: Short-lived (15 minutes) for security
- **Refresh Token**: Long-lived (7 days) in httpOnly cookie
- **Password Security**: Hashed with bcrypt (salt rounds: 10)
- **Token Storage**: Access token in memory, refresh token in cookie
- **No Database Storage**: Refresh tokens are stateless (JWT-based)

## 🔄 Migration from Basic Auth

This implementation replaces any basic authentication with:
- ✅ JWT-based stateless authentication
- ✅ Refresh token mechanism
- ✅ Secure cookie handling
- ✅ Better security practices

---

**Next Steps**: 
- Issue #2: CV Upload & Parse API
- Issue #5: Store Parsed CV Data to Database


