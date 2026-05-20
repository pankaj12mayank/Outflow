# ===========================================
# OUTFLO - AUTHENTICATION & AUTHORIZATION
# ===========================================

## Overview

Complete authentication and authorization system with:
- JWT-based authentication
- Refresh token rotation
- Multi-tenant organization isolation
- Role-based access control (RBAC)
- Team management
- Security features (rate limiting, brute-force protection)

## Features Implemented

### AUTH Methods
- Email/password login
- Registration with organization creation
- Magic link login
- Forgot password
- Reset password
- Email verification
- Google OAuth (stub for future)
- Session management
- Token refresh

### Security Features
- JWT access tokens (30 min expiry)
- Refresh tokens (7 day expiry)
- Rate limiting (100 requests/minute)
- Brute-force protection (5 attempts, 30 min lockout)
- Device tracking (browser, OS, IP)
- Session invalidation on logout
- Password strength validation

### RBAC Roles
- `super_admin`: Full system access (*)
- `owner`: Organization owner (all org permissions)
- `admin`: Organization admin (leads, campaigns, emails, AI, CRM)
- `team_member`: Limited access (read, create, update)

### Permission Structure
```
org:*          - Organization management
users:*        - User management
leads:*        - Lead operations
campaigns:*    - Campaign operations
emails:*       - Email operations
ai:*           - AI operations
crm:*          - CRM operations
analytics:*    - Analytics access
billing:*      - Billing management
```

### Team Management
- Invite users via email
- Accept invitations with account creation
- Role assignment (admin/team_member)
- Remove team members
- Revoke pending invitations
- View active sessions
- Revoke individual/all sessions

## API Endpoints

### Auth Endpoints
```
POST /api/v1/auth/register        - Register new user
POST /api/v1/auth/login           - Login
POST /api/v1/auth/logout          - Logout
POST /api/v1/auth/refresh          - Refresh token
POST /api/v1/auth/magic-link       - Request magic link
POST /api/v1/auth/magic-link/verify - Verify magic link
POST /api/v1/auth/forgot-password   - Request reset
POST /api/v1/auth/reset-password    - Reset password
POST /api/v1/auth/change-password   - Change password
POST /api/v1/auth/verify-email      - Verify email
POST /api/v1/auth/resend-verification - Resend verification
GET  /api/v1/auth/me               - Get current user
GET  /api/v1/auth/sessions         - List sessions
DELETE /api/v1/auth/sessions/{id}  - Revoke session
DELETE /api/v1/auth/sessions        - Revoke all sessions
```

### Team Endpoints
```
GET  /api/v1/team/members         - List team members
POST /api/v1/team/invite           - Invite user
POST /api/v1/team/invite/accept    - Accept invitation
GET  /api/v1/team/invitations      - List pending invitations
DELETE /api/v1/team/invitations/{id} - Revoke invitation
PUT  /api/v1/team/members/{id}/role - Update role
DELETE /api/v1/team/members/{id}   - Remove member
GET  /api/v1/team/permissions      - Get my permissions
GET  /api/v1/team/permissions/{resource} - Check resource access
GET  /api/v1/team/permissions/{resource}/{action} - Check action permission
```

## Frontend Pages

- `/login` - Email/password login
- `/login/magic-link` - Magic link login
- `/register` - Registration
- `/forgot-password` - Request password reset
- `/reset-password` - Reset password
- `/verify-email` - Email verification
- `/profile` - Profile & security settings
- `/team` - Team management

## Security Best Practices

1. **Token Storage**: Access and refresh tokens stored in localStorage
2. **Token Rotation**: Old refresh tokens invalidated on use
3. **Password Hashing**: bcrypt with automatic salt
4. **Rate Limiting**: In-memory (use Redis in production)
5. **Session Tracking**: Device, browser, OS, IP logged
6. **Audit Logging**: All auth actions logged
7. **Organization Isolation**: All queries filtered by organization_id

## Usage

### Backend
```python
from app.services.auth_service import AuthService

auth_service = AuthService(db)
result = await auth_service.login(data, request)
```

### Frontend
```typescript
import { useAuth } from '@/app/hooks/useAuth'

const { login, logout, user } = useAuth()
await login(email, password)
```

## Environment Variables

```bash
# Auth
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
SECRET_KEY=your-secret-key

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_SECONDS=60
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30
```

## Database Collections

MongoDB collections (NoSQL):
- `users` - User accounts (with organization_id reference)
- `organizations` - Multi-tenant root entities
- `sessions` - Active sessions and tokens (for JWT refresh)
- `login_logs` - Login attempt history
- `audit_logs` - Action audit trail

All user-scoped collections include `organization_id` for multi-tenant isolation.