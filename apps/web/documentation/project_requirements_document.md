# Project Requirements Document

## 1. Project Overview

We’re building a high-performance Distributor Application that lets businesses manage products, pricing schemes, stock levels, and point-of-sale (POS) orders in one place. It’s a modern web app with a decoupled frontend and backend: the frontend uses Next.js running on Bun for blazing-fast page loads, while the backend is an Express.js API server on Bun handling data persistence in MongoDB via Prisma. A key focus is offline-first POS capability, real-time stock alerts, and robust background jobs for large file imports and notifications.

This app is being built to replace a Firebase-based starter kit with your custom tech stack and complex business rules. Our success criteria include: sub-100 ms server-render times, sub-200 ms API responses under typical load, ACID-compliant transactions for sales and stock updates, secure JWT-based authentication with role-based access control, and seamless offline/online synchronization of POS orders. Meeting these benchmarks will ensure both performance and reliability for end users.

## 2. In-Scope vs. Out-of-Scope

**In-Scope (First Version):**
- User authentication (JWT Access/Refresh tokens) and role-based access control (Owner, Admin, Sales)
- Product CRUD (Create/Read/Update/Delete)
- Pricing scheme CRUD with cost-guard validation
- Offline-first POS cart (Zustand state + IndexedDB sync)
- Express.js API on Bun with Prisma ORM for MongoDB
- Real-time updates via Socket.io (stock thresholds, order status)
- Background jobs with BullMQ and Redis (threshold notifications, CSV import)
- Bulk CSV import/export of products and orders via streams
- Flip.id webhook verification with HMAC
- Shared Zod schemas for request/response validation
- Monorepo structure (apps/web & apps/api) using Bun workspaces
- Unit testing with Vitest and end-to-end testing with Playwright

**Out-of-Scope (Later Phases):**
- Multi-tenant support or complex organizational hierarchies
- Invoicing, tax calculations, or third-party accounting integrations
- Advanced reporting dashboards (beyond basic lists)
- Mobile-specific native apps (React Native or SwiftUI)
- AI-driven recommendations or predictive analytics

## 3. User Flow

A new user lands on the homepage and clicks “Sign Up.” They provide an email and password, then receive a verification link. After verifying, they’re redirected to the dashboard. The dashboard has a left sidebar with navigation links: Products, Pricing Schemes, POS, Orders, and Settings. The main content area loads the selected module, showing tables, forms, or real-time alerts.

To make a sale at the POS, the user clicks “POS.” A client component loads an offline-first shopping cart interface. They scan or type product SKUs to add items, apply pricing schemes, and hit “Checkout.” The order is stored locally if offline, then automatically synced when connectivity returns. Meanwhile, any low-stock conditions trigger Socket.io alerts in the sidebar. Administrators visit the Products or Pricing Schemes pages to manage data using familiar CRUD forms with real-time validation powered by Zod.

## 4. Core Features

- **Authentication & Authorization:** Custom JWT-based flow (access + refresh tokens), secure password hashing, RBAC middleware.
- **Product Management:** Full CRUD, server components for fast listings, Prisma schema with indexes on SKU.
- **Pricing Schemes:** Create tiered or formula-based price schemes, enforce “Cost Guard” to prevent below-cost selling.
- **Offline-First POS Cart:** Zustand store + IndexedDB, auto-sync on reconnect, optimistic UI updates.
- **Real-Time Notifications:** Socket.io channels for stock thresholds and order updates.
- **Background Jobs:** BullMQ + Redis for threshold alert emails and large CSV processing.
- **Bulk Import/Export:** Streaming CSV upload/download endpoints in Express.
- **Webhook Handling:** Flip.id endpoint with HMAC validation.
- **Shared Validation:** Zod schemas imported by both frontend and backend for type safety.
- **Monorepo Setup:** apps/web (Next.js) & apps/api (Express) with Bun workspaces.
- **Testing & Observability:** Vitest, Playwright, Winston logging with correlation IDs.

## 5. Tech Stack & Tools

- **Frontend:** Next.js (App Router) on Bun, TypeScript, Tailwind CSS, shadcn/ui component library
- **State & Data:** React Query (server state), Zustand (client/offline state)
- **Backend:** Bun runtime, Express.js, TypeScript, Prisma ORM on MongoDB, Zod for schema validation
- **Real-Time:** Socket.io (WebSocket)
- **Queues:** BullMQ with Redis
- **Workspaces:** Bun workspaces (monorepo)
- **Testing:** Vitest (unit), Playwright (E2E)
- **Logging:** Winston with structured JSON and correlation IDs
- **Webhook Security:** HMAC-SHA256 verification for Flip.id
- **IDE Integrations (optional):** Cursor or Windsurf plugins for code completion, Bun watcher for hot reload

## 6. Non-Functional Requirements

- **Performance:** Initial server render <100 ms; typical API response <200 ms under 100 concurrent users.
- **Scalability:** Socket.io should handle at least 500 simultaneous connections; BullMQ must process 100 jobs/minute.
- **Security:** OWASP Top 10 compliance, HTTPS only, secure JWT storage (HttpOnly cookies), rate limiting, helmet middleware.
- **Reliability:** ACID transactions for sales and stock updates using `prisma.$transaction`.
- **Usability:** WCAG 2.1 AA accessibility, mobile-responsive layouts, form validation feedback.
- **Maintainability:** Shared types, modular code organization, clear JSDoc comments.

## 7. Constraints & Assumptions

- Bun must be used as the runtime for both frontend and backend.
- Redis instance available for BullMQ and session caching.
- MongoDB cluster provisioned with ability to create indexes.
- Flip.id credentials and webhook secrets provided at deployment.
- Users will have intermittent internet connectivity for offline POS.
- Shared Zod schemas assume no breaking type changes in early phases.

## 8. Known Issues & Potential Pitfalls

- **API Rate Limits:** If external services impose rate caps, implement exponential backoff and retries.
- **Socket.io Scaling:** For many concurrent users, consider using a Redis adapter.
- **Offline Sync Conflicts:** Define conflict-resolution rules (e.g., last writer wins or server-timestamp merge).
- **Large CSV Imports:** Use Node streams and chunked uploads to avoid memory spikes.
- **Monorepo Complexity:** Enforce workspace boundaries, leverage linting and type checks across packages.
- **Schema Drift:** Pin shared Zod schema versions and use automated contract tests.
- **Webhook Replay Attacks:** Implement timestamp and nonce checks along with HMAC.

---

This document outlines exactly what the Distributor Application must deliver in its first version, with clear boundaries, flows, and technical details. It serves as the single source of truth for all subsequent technical designs and implementation guides.