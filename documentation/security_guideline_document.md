# Security Guidelines for the Distributor Application

This document outlines security best practices tailored to the Next.js frontend on Bun, Express.js backend on Bun (with Prisma and MongoDB), Zod validation, Zustand state management, Socket.io, BullMQ, Redis, and custom JWT/RBAC flows. It applies the core security principles of Security by Design, Least Privilege, Defense in Depth, Input Validation, and Secure Defaults.

---

## 1. Authentication & Access Control

• **Custom JWT Flow**  
  – Use RS256 (RSA) or HS512 (HMAC) algorithms; never support "none."  
  – Keep separate key pairs for access (short‐lived, ~15m) and refresh tokens (longer, ~7d).  
  – Store secrets (private keys) in a vault (e.g., HashiCorp Vault, AWS Secrets Manager), not in code or plain env files.  

• **Session & Token Security**  
  – Set Secure, HttpOnly, SameSite=strict on any cookie carrying a refresh token.  
  – Implement token rotation: issue a new refresh token on each use and revoke the old one in the database.  
  – Enforce idle and absolute timeouts; revoke tokens server‐side if suspicious activity is detected.  
  – Protect against replay and brute force by rate limiting `/auth/login` and `/auth/refresh` endpoints.  

• **Role‐Based Access Control (RBAC)**  
  – Define roles (`Owner`, `Admin`, `Sales`, etc.) and granular permissions in a central store.  
  – Enforce RBAC at the middleware layer in Express; validate the JWT, then check claims against required permissions for each route.  
  – Fail securely: return 403 without revealing internal role structures.  

• **Multi‐Factor Authentication (MFA)** (Optional but recommended)  
  – Integrate TOTP or SMS/email OTP for high‐privilege operations (e.g., changing RBAC assignments).  
  – Store MFA secrets encrypted at rest (e.g., in MongoDB with field‐level encryption).  

---

## 2. Input Handling & Processing

• **Schema Validation with Zod**  
  – Define shared Zod schemas in `packages/shared-types` and reuse in both Next.js server components (for ISR/SSR fetch) and Express endpoints.  
  – Always run server‐side validation before any business logic or database operation.  

• **Prevent Injection Attacks**  
  – Use Prisma’s parameterized queries; avoid raw SQL unless absolutely necessary.  
  – Escape any string interpolation in Socket.io messages or background job data.  

• **Command/Path Traversal**  
  – When processing CSV imports or file uploads, sanitize file names and enforce an allowlist of MIME types.  
  – Store uploads outside the webroot (e.g., in an `uploads/` folder with restricted permissions).  

• **Cross‐Site Scripting (XSS)**  
  – Use Next.js’s built‐in `next/head` sanitization for dynamic `<title>` or meta tags.  
  – For any HTML editing or rich‐text fields, sanitize inputs via a library like DOMPurify.  
  – Employ a strict Content Security Policy (CSP) in both frontend and Express responses to avoid inline scripts.  

• **CSRF Protection**  
  – Apply Synchronizer Tokens (Double‐Submit Cookie) or use `csurf` middleware on state‐changing Express routes (POST/PUT/DELETE).  

---

## 3. Data Protection & Privacy

• **Transport Encryption**  
  – Enforce HTTPS/TLS 1.2+ in production; redirect all HTTP to HTTPS.  
  – Use HSTS header with `preload`, `includeSubDomains`, `max-age=31536000`.  

• **Encryption at Rest**  
  – Enable MongoDB’s encrypted storage engine or use field‐level encryption for PII.  
  – Encrypt sensitive logs and backups; rotate encryption keys regularly.  

• **Strong Hashing for Passwords**  
  – If local passwords are used, hash with Argon2id or bcrypt with a unique salt per password.  

• **Secrets Management**  
  – Store database URLs, JWT private keys, API keys in a secure vault.  
  – Validate all required env vars at startup using Zod (`zod-env`).  

• **Privacy Compliance**  
  – Minimize PII collection; mask or truncate it in logs and API responses.  
  – Provide data deletion/erasure endpoints fulfilling GDPR/CCPA requirements.  

---

## 4. API & Service Security

• **Rate Limiting & Throttling**  
  – Use `express-rate-limit` or a token bucket algorithm via Redis to throttle login, data import, and webhook endpoints.  

• **CORS Configuration**  
  – Restrict origins to known frontend host(s) and localhost during development.  
  – Disallow wildcard (`*`) credentials; explicitly allow methods and headers required.  

• **Versioning & Least Privilege**  
  – Prefix routes with `/api/v1/...` and follow semantic versioning for breaking changes.  

• **Webhook Security (Flip.id)**  
  – Validate HMAC signatures on incoming webhooks using a constant‐time comparison.  
  – Reject requests older than a configured timestamp window to prevent replay.  

---

## 5. Web Application Security Hygiene

• **Security Headers**  
  – `Content-Security-Policy`: Disallow inline scripts/styles; only allow trusted CDNs.  
  – `X-Content-Type-Options: nosniff`  
  – `X-Frame-Options: DENY` or CSP `frame-ancestors 'none'`  
  – `Referrer-Policy: no-referrer-when-downgrade`  

• **Secure Cookies**  
  – For any session or JWT cookie: `HttpOnly; Secure; SameSite=Strict`.  
  – Avoid storing tokens in localStorage/sessionStorage.  

• **Subresource Integrity (SRI)**  
  – Add SRI hashes to any CDN‐hosted scripts or styles in `_document.tsx`.  

• **Disable Client‐Side Debugging in Prod**  
  – Ensure `NODE_ENV=production` and Next.js’s `reactStrictMode` is appropriate.  

---

## 6. Infrastructure & Configuration Management

• **Server Hardening**  
  – Run Bun/Node.js under a non‐root, least‐privileged OS user.  
  – Disable unused system services and ports.  

• **TLS/SSL**  
  – Use strong cipher suites and disable TLS 1.0/1.1.  
  – Automate certificate renewal with Let’s Encrypt or a managed CA.  

• **File Permissions**  
  – Restrict code and log directories to the application user; deny world‐write access.  

• **Continuous Patching**  
  – Automate dependency and system updates.  
  – Subscribe to security bulletins for Bun, Node, MongoDB, Prisma, and OS.  

---

## 7. Dependency Management

• **Use Bun Lockfile**  
  – Commit `bun.lockb` (or `package-lock.json`) to ensure reproducible builds.  

• **SCA & Vulnerability Scanning**  
  – Integrate GitHub Dependabot or Snyk to detect CVEs in direct and transitive deps.  

• **Minimize Attack Surface**  
  – Only install production dependencies; mark dev dependencies appropriately.  
  – Remove unused modules and CLI tools from production images.  


---

Adhering to these guidelines ensures a defense-in-depth posture, minimal attack surface, and secure defaults for your high-performance Distributor application. Integrate automated scans, monitor logs, and continuously review configurations as part of your CI/CD pipeline to maintain resilience over time.