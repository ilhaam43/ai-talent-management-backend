# JWT Token Best Practices

## Current Implementation Issues

### ❌ Current Setup (60 minutes)
- **Access Token**: 60 minutes (too long)
- **No Refresh Token**: Users must re-login every hour
- **No Token Revocation**: Can't invalidate tokens before expiry
- **Security Risk**: If token is stolen, attacker has 60 minutes of access

## ✅ Recommended Best Practices

### 1. Short-Lived Access Tokens (15-30 minutes)
```typescript
// Recommended for access tokens
signOptions: { expiresIn: '15m' }  // or '30m'
```

**Why?**
- Limits damage if token is compromised
- Forces regular token refresh
- Better security posture

### 2. Refresh Token Pattern

**Access Token (15-30 min)**
- Short-lived
- Used for API requests
- Stored in memory (not localStorage)

**Refresh Token (7-30 days)**
- Long-lived
- Used only to get new access tokens
- Stored securely (httpOnly cookie or secure storage)
- Can be revoked

### 3. Implementation Strategy

#### Option A: Simple (Current + Shorter Expiry)
```typescript
// Just reduce expiry time
signOptions: { expiresIn: '15m' }  // Better than 60m
```

**Pros:**
- Quick fix
- Better security
- No code changes needed

**Cons:**
- Users must re-login every 15 minutes
- Poor UX for long sessions

#### Option B: Refresh Token (Recommended)
```typescript
// Access token: 15 minutes
accessToken: { expiresIn: '15m' }

// Refresh token: 7 days
refreshToken: { expiresIn: '7d' }
```

**Implementation:**
1. Store refresh tokens in database
2. Add `/auth/refresh` endpoint
3. Frontend automatically refreshes access token
4. Can revoke refresh tokens

**Pros:**
- Best security
- Good UX (seamless refresh)
- Can revoke tokens
- Industry standard

**Cons:**
- More complex implementation
- Requires database changes

## Recommended Configuration

### For Development
```typescript
signOptions: { expiresIn: '15m' }  // Short-lived, simple
```

### For Production
```typescript
// Access token
accessToken: { expiresIn: '15m' }

// Refresh token (stored in DB)
refreshToken: { expiresIn: '7d' }
```

## Security Considerations

1. **Token Storage**
   - ❌ Don't store in localStorage (XSS vulnerable)
   - ✅ Use httpOnly cookies or memory storage
   - ✅ For mobile apps, use secure storage

2. **Token Rotation**
   - Rotate refresh tokens on each use
   - Invalidate old refresh tokens

3. **Token Revocation**
   - Store refresh tokens in database
   - Add `revoked` flag
   - Check on each refresh request

4. **HTTPS Only**
   - Always use HTTPS in production
   - Set secure cookie flags

## Migration Path

### Phase 1: Quick Fix (Now)
```typescript
// Reduce to 15-30 minutes
signOptions: { expiresIn: '15m' }
```

### Phase 2: Add Refresh Tokens (Later)
1. Add `refresh_tokens` table
2. Implement refresh endpoint
3. Update frontend to use refresh tokens

## Industry Standards

| Application Type | Access Token | Refresh Token |
|-----------------|--------------|---------------|
| Banking/Finance | 5-15 min | 1-7 days |
| E-commerce | 15-30 min | 7-30 days |
| Social Media | 15-60 min | 30-90 days |
| Internal Tools | 30-60 min | 7-30 days |

## References
- [OWASP JWT Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [Auth0 JWT Handbook](https://auth0.com/resources/ebooks/jwt-handbook)
- [RFC 8725: JSON Web Token Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)


