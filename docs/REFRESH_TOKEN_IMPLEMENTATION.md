# Refresh Token Implementation

## Overview

Refresh token mechanism implemented using **stateless JWT tokens stored in httpOnly cookies**. No database storage required - tokens are self-contained and validated via signature.

## Architecture

### Token Types

1. **Access Token** (15 minutes)
   - Short-lived JWT token
   - Used for API authentication
   - Sent in `Authorization: Bearer <token>` header
   - Stored in memory (frontend)

2. **Refresh Token** (7 days)
   - Long-lived JWT token
   - Used only to get new access tokens
   - Stored in **httpOnly cookie** (not accessible via JavaScript)
   - Automatically sent with requests

### Security Features

✅ **httpOnly Cookie**: Prevents XSS attacks (JavaScript can't access)  
✅ **Secure Flag**: Only sent over HTTPS in production  
✅ **SameSite: strict**: CSRF protection  
✅ **Separate Secret**: Refresh token uses different secret (optional)  
✅ **Stateless**: No database lookup needed  

## API Endpoints

### 1. Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGci...",
  "expires_in": 900
}
```

**Cookie Set:**
```
Set-Cookie: refresh_token=eyJhbGci...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/
```

### 2. Refresh Access Token
```http
POST /auth/refresh
```

**No body needed** - refresh token is automatically sent from cookie.

**Response:**
```json
{
  "access_token": "eyJhbGci...",
  "expires_in": 900
}
```

### 3. Logout
```http
POST /auth/logout
```

**Response:**
```json
{
  "message": "Logout successful"
}
```

**Cookie Cleared:**
```
Set-Cookie: refresh_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/
```

## Environment Variables

Add to `.env`:
```env
# Access token secret (required)
JWT_SECRET=your-secret-key-here

# Refresh token secret (optional, defaults to JWT_SECRET if not set)
JWT_REFRESH_SECRET=your-refresh-secret-key-here

# Frontend URL for CORS (optional, defaults to http://localhost:3001)
FRONTEND_URL=http://localhost:3001

# Node environment
NODE_ENV=production  # or development
```

## Frontend Implementation

### Login Flow
```typescript
// 1. Login
const response = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Important: include cookies
  body: JSON.stringify({ email, password }),
});

const { access_token, expires_in } = await response.json();

// Store access token in memory (not localStorage)
let accessToken = access_token;
let tokenExpiry = Date.now() + expires_in * 1000;
```

### Auto-Refresh Flow
```typescript
// 2. Before each API request, check if token is about to expire
async function getAccessToken() {
  // If token expires in less than 5 minutes, refresh it
  if (Date.now() > tokenExpiry - 5 * 60 * 1000) {
    await refreshToken();
  }
  return accessToken;
}

// 3. Refresh token function
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

// 4. Use in API calls
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

### Logout Flow
```typescript
async function logout() {
  await fetch('http://localhost:3000/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
  
  // Clear local access token
  accessToken = null;
  tokenExpiry = null;
  
  // Redirect to login
  window.location.href = '/login';
}
```

## Security Considerations

### ✅ Advantages (Stateless Approach)

1. **No Database Lookup**: Faster, scales better
2. **Simpler**: No token storage/cleanup needed
3. **Stateless**: Works across multiple servers

### ⚠️ Trade-offs

1. **No Token Revocation**: Can't invalidate tokens before expiry
   - **Mitigation**: Use short expiry (7 days is reasonable)
   - **Alternative**: If revocation needed, store tokens in DB

2. **Token Theft**: If refresh token is stolen, valid for 7 days
   - **Mitigation**: httpOnly cookie prevents XSS
   - **Mitigation**: Secure flag (HTTPS only)
   - **Mitigation**: SameSite prevents CSRF

3. **Cookie Theft**: If cookie is stolen (e.g., via XSS on other site)
   - **Mitigation**: SameSite=strict limits cross-site requests
   - **Mitigation**: Short access token (15 min) limits damage

## Testing

### Using cURL

```bash
# 1. Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# 2. Use access token from response
ACCESS_TOKEN="eyJhbGci..."

# 3. Make authenticated request
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 4. Refresh token (uses cookie from cookies.txt)
curl -X POST http://localhost:3000/auth/refresh \
  -b cookies.txt \
  -c cookies.txt

# 5. Logout
curl -X POST http://localhost:3000/auth/logout \
  -b cookies.txt
```

### Using Test Script

See `scripts/test-refresh-token.ts` (to be created)

## Migration from Old System

### Before (60 min access token, no refresh)
```typescript
// Old: Token valid for 60 minutes
signOptions: { expiresIn: '60m' }
```

### After (15 min access token + 7 day refresh token)
```typescript
// New: Access token 15 min, refresh token in cookie
signOptions: { expiresIn: '15m' }
// Refresh token: 7 days (set in cookie)
```

**Frontend Changes Required:**
1. Store access token in memory (not localStorage)
2. Implement auto-refresh before expiry
3. Include `credentials: 'include'` in fetch requests
4. Handle refresh token expiry (redirect to login)

## Best Practices

1. **Always use HTTPS in production**
   - Set `NODE_ENV=production` for secure cookies

2. **Set CORS properly**
   - Only allow your frontend domain
   - Use `credentials: true` in CORS config

3. **Monitor token usage**
   - Log refresh attempts
   - Alert on suspicious patterns

4. **Consider token rotation** (future enhancement)
   - Issue new refresh token on each refresh
   - Invalidate old refresh token

## Troubleshooting

### Cookie not being sent
- Check `credentials: 'include'` in fetch
- Check CORS `credentials: true` in backend
- Check cookie domain/path settings

### Refresh token expired
- User must login again
- Frontend should redirect to login page

### CORS errors
- Ensure `FRONTEND_URL` matches your frontend
- Check `credentials: true` in CORS config

## References

- [OWASP Cookie Security](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html)
- [MDN: HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [RFC 6265: HTTP State Management Mechanism](https://tools.ietf.org/html/rfc6265)


