# 🛡️ SURNA Security & Data Protection Guide

**Package S - Comprehensive Security Implementation**

This document outlines the security architecture, features, and best practices for the SURNA platform.

---

## 🔐 Security Overview

SURNA implements defense-in-depth security across all layers:

- **Authentication:** Short-lived JWT access tokens (10min) + rotating refresh tokens (14 days)
- **Authorization:** Role-Based Access Control (RBAC) with resource-level ownership checks
- **Input Validation:** Zod schema validation on all write endpoints
- **Encryption:** Field-level PII encryption + TLS for transport
- **File Security:** MIME validation, magic bytes checking, virus scanning hooks
- **Anomaly Detection:** Login pattern analysis, payment anomaly detection
- **Audit Logging:** Immutable audit trail for all sensitive actions
- **Rate Limiting:** IP and user-based rate limiting with Redis
- **Security Headers:** CSP, HSTS, X-Frame-Options, etc.

---

## 🔑 Authentication System

### JWT Token Architecture

**Access Tokens** (10 minute TTL):
- Stored in memory or localStorage on client
- Used for API authentication
- Short-lived to minimize exposure
- Automatically generated fallback secret in development

**Refresh Tokens** (14 day TTL):
- Stored in httpOnly, Secure, SameSite=Strict cookie
- Used to obtain new access tokens
- Tracked in Redis with `jti` (JWT ID) for revocation
- Falls back to in-memory storage if Redis unavailable
- Automatically generated fallback secret in development

### Token Flow

```
1. User logs in → Server issues access + refresh tokens
2. Client stores access token in memory
3. Client makes API request with Bearer token
4. Access token expires (10min) → Client gets 419 response
5. Client uses refresh token to get new access token
6. Server rotates refresh token (revokes old, issues new)
7. Repeat until refresh token expires or user logs out
```

### Re-Authentication

Sensitive operations require re-authentication:
- Password changes
- Email/phone changes
- Payouts and withdrawals
- Admin actions (if `lastAuthTime` > 5 minutes)

---

## 🎯 Authorization (RBAC)

### Roles

1. **user** - Basic platform access
2. **captain** - Team management
3. **coach** - Coaching features
4. **shop_owner** - Marketplace seller
5. **event_organizer** - Event creation/management
6. **finance_admin** - Payment oversight
7. **moderator** - Content moderation
8. **super_admin** - Full platform access

### Permissions Matrix

| Permission | Roles |
|------------|-------|
| `user:read` | all |
| `user:write` | user+ |
| `team:read` | all |
| `team:manage` | captain, moderator, super_admin |
| `event:read` | all |
| `event:manage` | event_organizer, moderator, super_admin |
| `shop:read` | all |
| `shop:manage` | shop_owner, moderator, super_admin |
| `challenge:read` | all |
| `challenge:manage` | captain, moderator, super_admin |
| `payments:read` | user, shop_owner, finance_admin, super_admin |
| `payments:payout` | finance_admin, super_admin |
| `content:moderate` | moderator, super_admin |
| `admin:*` | super_admin |

### Resource-Level Authorization

**Implementation Status:** Middleware provided, routes integration in progress.

The `requireOwnership` middleware is available for resource-level authorization:

```typescript
// Example usage (to be integrated into feature routes):
import { requireOwnership } from "@/server/security";

app.patch("/api/teams/:teamId",
  requireAuth,
  requireOwnership(async (req) => {
    const team = await db.getTeam(req.params.teamId);
    return {
      id: team.id,
      captainId: team.captainId // Check if user is captain
    };
  }),
  async (req, res) => {
    // Only team captain or admin can reach here
  }
);
```

**Note:** Feature routes currently use existing isAuthenticated middleware. Migration to Package S RBAC middleware is recommended for production deployment.

---

## 🧼 Input Validation

All write endpoints use Zod schemas for validation:

```typescript
app.post("/api/events", 
  requireAuth,
  validate(schemas.createEvent),
  async (req, res) => {
    const data = (req as any).validated;
    // data is type-safe and validated
  }
);
```

**Validation Rules:**
- Reject malformed requests with 400 Bad Request
- Never coerce silently - explicit validation errors
- HTML escape all user content before rendering
- Maximum string lengths enforced
- Type checking (numbers, dates, URLs, etc.)

---

## 🔒 Data Encryption

### Field-Level Encryption

Sensitive PII is encrypted at rest:

```typescript
import { encrypt, decrypt } from "@/server/security";

// Encrypt before storing
const encryptedEmail = encrypt(user.email);
await db.users.insert({ ...user, email: encryptedEmail });

// Decrypt when needed
const email = decrypt(user.emailEnc);
```

**Encrypted Fields:**
- Email addresses (optional)
- Phone numbers (optional)
- Payment details
- Personal identifiers

### Transport Security

- **TLS 1.2/1.3 only** - No older protocols
- **HSTS enabled** - Strict-Transport-Security header
- **Secure cookies** - httpOnly, Secure, SameSite=Strict

---

## 📁 File Upload Security

### Validation Pipeline

1. **Size check** - Max 100MB
2. **MIME type check** - Allowed: images, videos, audio, PDF
3. **Magic bytes validation** - Content matches declared type
4. **Virus scan** - ClamAV or cloud service (hook provided)
5. **EXIF stripping** - Remove metadata from images
6. **Signed URLs** - Time-limited access to files

### Example Usage

```typescript
app.post("/api/upload",
  requireAuth,
  uploadsMw,
  validateUpload(["image", "video"], 50 * 1024 * 1024),
  async (req, res) => {
    const file = (req as any).files.file;
    // File is validated and safe
  }
);
```

---

## 🚨 Anomaly Detection

### Login Anomalies

Detected patterns:
- New country (high confidence: 0.8)
- New device/user agent (medium confidence: 0.6)
- Unusual login time (low confidence: 0.5)

**Response:**
- Require MFA for high-confidence anomalies
- Send email notification
- Log for security review

### Payment Anomalies

Detected patterns:
- Amount > 3x average (confidence: 0.9)
- Amount > 2x historical max (confidence: 0.85)
- >10 payments in 5 minutes (confidence: 0.95)

**Response:**
- Require manual approval for high-confidence anomalies
- Additional verification step
- Fraud review queue

---

## 🛡️ Rate Limiting

### Tiers

| Endpoint | Limit | Window |
|----------|-------|--------|
| Auth (login, register) | 10 req | 60s |
| File uploads | 5 req | 60s |
| API (general) | 100 req | 60s |
| Search | 20 req | 60s |
| Payments | 10 req | 300s |

### Implementation

```typescript
import { rateLimit } from "@/server/security";

app.post("/api/auth/login",
  rateLimit(authLimiter),
  async (req, res) => {
    // Protected by rate limiting
  }
);
```

**Response on limit exceeded:**
- HTTP 429 Too Many Requests
- `Retry-After` header with seconds
- Clear error message

---

## 📊 Audit Logging

All sensitive actions are logged to `admin_audit_logs`:

- User bans/unbans
- Payment refunds
- Content removals
- Role changes
- Admin actions
- Payout approvals

**Audit Log Fields:**
- adminId - Who performed the action
- action - What was done
- targetType/targetId - What was affected
- before/after - State snapshots (PII redacted)
- reason - Justification
- ip - Source IP address
- timestamp - When it occurred

---

## 🔐 Secrets Management

### Required Secrets

```bash
DATABASE_URL=postgresql://...
```

### Recommended Secrets (with auto-fallback)

```bash
# JWT Authentication (auto-generates temporary keys if missing)
JWT_ACCESS_SECRET=<256-bit hex key>
JWT_REFRESH_SECRET=<256-bit hex key>

# Field Encryption (auto-generates temporary key if missing)
FIELD_ENC_KEY_HEX=<512-bit hex key>

# File Security
SIGNED_URL_SECRET=<256-bit hex key>

# Redis (falls back to in-memory if missing)
REDIS_URL=redis://...

# Payment Integration
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Development Mode:** The system automatically generates temporary keys for JWT and encryption if environment variables are not set. This allows immediate development without secret configuration, but **production deployments must set all secrets** to ensure tokens/data persist across restarts.

### Key Rotation

**Schedule:** Every 90 days

1. Generate new key
2. Deploy with both old and new keys
3. Migrate data if needed
4. Remove old key after grace period

---

## 🌐 Security Headers

Applied by Helmet middleware:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; ...
```

---

## 🧪 Security Checklist

### Before Production

- [ ] All secrets set in environment variables
- [ ] TLS/HTTPS enabled
- [ ] HSTS header enabled
- [ ] CSP configured
- [ ] Rate limiting active
- [ ] File upload validation enabled
- [ ] Audit logging enabled
- [ ] Database backups configured
- [ ] Intrusion detection active
- [ ] Virus scanning enabled
- [ ] MFA required for admins
- [ ] Security headers verified
- [ ] CORS allowlist configured
- [ ] CSRF protection enabled
- [ ] SQL injection prevented (using ORM)
- [ ] XSS prevented (input validation + output encoding)
- [ ] Secrets rotation schedule
- [ ] Incident response plan
- [ ] Security monitoring dashboard

---

## 🆘 Incident Response

### Detection

- Monitor auth failures
- Track 4xx/5xx error rates
- Alert on rate limit violations
- Watch payment anomalies
- Review audit logs

### Response Steps

1. **Identify** - Determine scope and impact
2. **Contain** - Block attacker, revoke tokens
3. **Eradicate** - Remove malicious code/data
4. **Recover** - Restore from backups if needed
5. **Learn** - Post-mortem and improvements

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Replit Security Best Practices](https://docs.replit.com/security)

---

**Last Updated:** November 10, 2025  
**Version:** 1.0.0 (Package S)
