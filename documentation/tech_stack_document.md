# Tech Stack Document

This document explains, in everyday language, the technologies chosen for your high-performance Distributor Application. It covers the frontend, backend, infrastructure, integrations, security, and performance optimizations so that anyone—technical or not—can follow the reasoning behind each choice.

## 1. Frontend Technologies

We chose a modern frontend setup to deliver a fast, responsive, and user-friendly interface.

- **Next.js (App Router)**
  - Provides built-in server-side rendering (SSR) and static generation (SSG) for quick page loads.
  - Lets us split code into “server components” (rendered on the server for speed) and “client components” (for interactive elements).
- **React & TypeScript**
  - React makes building interactive UIs straightforward.
  - TypeScript adds clear type-checking, reducing errors and improving code understandability.
- **shadcn/ui + Tailwind CSS**
  - A collection of ready-made, accessible UI components you can customize freely.
  - Tailwind’s utility-first approach ensures consistent styling without writing lengthy CSS files.
- **State Management**
  - **React Query (TanStack Query):** Caches and syncs server data. It handles loading states and background refetching, so users always see up-to-date information.
  - **Zustand:** Manages local UI state—like the offline-capable POS cart and on-screen toggles—with minimal boilerplate.
- **Data Validation & Forms**
  - **Zod + React Hook Form:** Ensures forms (e.g., price scheme creation) accept only valid data, giving users immediate feedback.

How these choices help your users:

- Faster page loads (SSR & SSG).
- Smooth interactions (client components + state management).
- Consistent, accessible design (shadcn/ui + Tailwind).
- Fewer errors at runtime (TypeScript + Zod).

## 2. Backend Technologies

The backend powers your business logic, data storage, and real-time features.

- **Bun + Express.js**
  - **Bun** is a high-performance JavaScript runtime with very fast startup and built-in tools.
  - **Express** provides a familiar, minimal framework for defining RESTful APIs and middleware.
- **MongoDB + Prisma ORM**
  - **MongoDB** stores your product, pricing, and sales data in a flexible, document-based database.
  - **Prisma** offers a type-safe interface to MongoDB, auto-generating queries and migrations.
- **Zod**
  - Validates all incoming and outgoing data against shared schemas to prevent invalid data from reaching your database.
- **Real-Time & Background Processing**
  - **Socket.io:** Pushes live stock updates and order status notifications to the browser.
  - **BullMQ + Redis:** Queues jobs like sending alerts when stock hits safety thresholds or processing large CSV imports.
- **Authentication & Authorization**
  - Custom JWT (access & refresh tokens) strategy.
  - Role-Based Access Control (RBAC) middleware to restrict routes by user role (Owner, Admin, Sales, etc.).

How these pieces work together:

1. A Next.js page calls an Express endpoint.
2. Express validates the request with Zod, then uses Prisma to talk to MongoDB.
3. If it’s a long-running task, it goes into a BullMQ queue in Redis.
4. For real-time events, Express emits Socket.io messages to connected users.
5. JWTs and RBAC guard every protected endpoint.

## 3. Infrastructure and Deployment

We set up a reliable, scalable system and streamlined deployments.

- **Monorepo with Bun Workspaces**
  - `apps/web` for the Next.js frontend.
  - `apps/api` for the Express backend.
  - `packages/shared-types` for Zod schemas shared by both.
- **Version Control: Git & GitHub**
  - All code lives in a GitHub repository with branch protections.
- **CI/CD: GitHub Actions**
  - Runs linting, tests (Vitest & Playwright), and builds on each pull request.
  - Deploys automatically on merge to `main` (production) or `develop` (staging).
- **Hosting**
  - **Frontend:** Deployed on Vercel for optimized Next.js performance.
  - **Backend:** Deployed on a cloud platform (e.g., Fly.io, Railway) supporting Bun.
- **Environment Management**
  - Secure environment variables (.env files validated by Zod at startup).
  - Separate variables for staging vs. production.

These choices ensure quick releases, easy rollbacks, and clear separation between code, configuration, and secrets.

## 4. Third-Party Integrations

We plug into specialized services to extend functionality without reinventing the wheel.

- **Flip.id (Webhooks)**
  - Handles payment or external event notifications.
  - Express verifies each webhook’s HMAC signature before processing.
- **Redis**
  - Backing store for BullMQ queues and caching ephemeral data.

Each integration is encapsulated in its own module, making it easy to swap or upgrade services in the future.

## 5. Security and Performance Considerations

Security Measures:

- **JWT Authentication with Access & Refresh Tokens**
- **RBAC Middleware** to enforce permissions per route.
- **Password Hashing** using Argon2 or Bcrypt.
- **Rate Limiting & Helmet** in Express to protect against brute-force and common web attacks.
- **Zod Validation** for all incoming data.
- **HMAC Verification** for Flip.id webhooks.
- **Environment Variable Validation** to prevent missing or malformed secrets.

Performance Optimizations:

- **Bun Runtime** for ultrafast server startup and low memory usage.
- **Next.js Server Components** to reduce client-side bundle size.
- **React Query Caching** to minimize redundant requests.
- **IndexedDB + Zustand** for offline POS cart and quick local reads.
- **Atomic Transactions with Prisma** (MongoDB) to keep data consistent.
- **Socket.io** for efficient real-time updates.
- **Worker Queues (BullMQ)** to offload long-running tasks.
- **Structured Logging & Correlation IDs (Winston)** for easy performance tracing.

Together, these features keep your app safe, fast, and reliable under load.

## 6. Conclusion and Overall Tech Stack Summary

We’ve assembled a tech stack that meets your distributor app’s core needs:

- **Frontend:** Next.js + React + TypeScript + shadcn/ui + Tailwind + React Query + Zustand.
- **Backend:** Bun + Express + MongoDB + Prisma + Zod + Socket.io + BullMQ + Redis.
- **Security:** JWT & RBAC + Argon2/Bcrypt + Helmet + Rate Limiter + HMAC verification.
- **Deployment:** Monorepo (Bun workspaces) + GitHub Actions + Vercel (frontend) + cloud hosting (backend).
- **Testing & Observability:** Vitest + Playwright + Winston logging + correlation IDs.

Key advantages:

- **Performance:** Bun runtime + SSR/SSG + server components + efficient caching.
- **Scalability:** Separate apps in a monorepo, worker queues, real-time channels.
- **Maintainability:** Shared types, clear folder structure, comprehensive tests.
- **User Experience:** Fast load times, offline POS support, real-time feedback.

This stack aligns with your project goals: high performance, robust business logic, and a smooth developer experience. If you have questions or need to adjust any component, the choices are modular and easy to swap out without impacting the overall architecture.