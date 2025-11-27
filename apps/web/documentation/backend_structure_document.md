# Backend Structure Document

This document outlines the backend architecture, hosting setup, and infrastructure components for the Distributor Application. It uses clear, everyday language so anyone can understand the backend setup without a technical background.

## 1. Backend Architecture

**Overview**
The backend is a separate service built with Express.js, running on the high-performance Bun runtime. We follow a layered design pattern to separate concerns:

- **Controllers** handle incoming HTTP requests and send responses.
- **Services** contain business logic (for example, calculating final prices or handling transactions).
- **Data Access** is managed by Prisma, which talks to MongoDB and provides a type-safe way to read and write data.
- **Workers** run background tasks (like sending out low-stock alerts) via BullMQ and Redis.
- **Real-time Layer** uses Socket.io to push live stock updates or order status changes to clients.

**Scalability**
- Bun offers fast startup times and low memory use, so we can scale horizontally by adding more instances.
- BullMQ and Redis let us queue and distribute background jobs across multiple worker processes.
- Socket.io can be scaled with a Redis adapter to broadcast events across instances.

**Maintainability**
- Clear folder structure (`controllers/`, `services/`, `middleware/`, `workers/`).
- Shared Zod schemas ensure data shapes are consistent across controllers and services.
- Monorepo setup (with Bun workspaces) groups the backend and frontend together, plus a shared folder for common types and validation rules.

**Performance**
- Prisma’s built-in caching and optimized queries reduce database round trips.
- Socket.io avoids frequent HTTP polling by pushing only the necessary updates.
- Background jobs keep HTTP endpoints fast by offloading slow tasks.

## 2. Database Management

We use a NoSQL database (MongoDB) alongside Prisma ORM for a type-safe interface.

- **Database Type**: NoSQL (document store).
- **Primary Technology**: MongoDB (hosted on MongoDB Atlas).
- **ORM**: Prisma (with the MongoDB connector).

**Data Structure & Access**
- Each main entity lives in its own collection (for example, `users`, `products`, `priceSchemes`, `transactions`).
- Prisma provides a schema file and client API to perform queries, updates, and transactions in a consistent way.
- We use `prisma.$transaction` to group related operations (like creating a sale and decrementing stock) so they succeed or fail together.

**Data Management Practices**
- **Indexes** on frequently queried fields (e.g., `Product.sku`) speed up lookups.
- **Atomic Operations** via transactions guarantee data consistency.
- **Validation** with Zod ensures all incoming data matches the expected format before touching the database.

## 3. Database Schema

Below is a human-readable overview of each collection and its fields.

**Users**
- `_id` (unique identifier)
- `email` (string)
- `hashedPassword` (string)
- `role` (enum: Owner, Admin, Sales)
- `createdAt` (timestamp)

**Products**
- `_id` (unique identifier)
- `name` (string)
- `sku` (string, unique)
- `description` (string)
- `createdAt` (timestamp)

**PriceSchemes**
- `_id` (unique identifier)
- `productId` (reference to a Product)
- `region` (string)
- `price` (decimal)
- `startDate` (date)
- `endDate` (date)

**Transactions**
- `_id` (unique identifier)
- `productId` (reference to a Product)
- `quantity` (integer)
- `finalPrice` (decimal)
- `performedBy` (reference to a User)
- `createdAt` (timestamp)

**StockAlerts** (background job records)
- `_id` (unique identifier)
- `productId` (reference to a Product)
- `threshold` (integer)
- `notifiedAt` (timestamp)

**Prisma Schema Snippet (for MongoDB)**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

model User {
  id             String   @id @map("_id") @default(auto())
  email          String   @unique
  hashedPassword String
  role           String
  createdAt      DateTime @default(now())
}

model Product {
  id        String   @id @map("_id") @default(auto())
  name      String
  sku       String   @unique
  description String?
  createdAt DateTime @default(now())
}

model PriceScheme {
  id        String   @id @map("_id") @default(auto())
  productId String
  region    String
  price     Float
  startDate DateTime
  endDate   DateTime
}

model Transaction {
  id          String   @id @map("_id") @default(auto())
  productId   String
  quantity    Int
  finalPrice  Float
  performedBy String
  createdAt   DateTime @default(now())
}
```  

## 4. API Design and Endpoints

We follow a RESTful design for clear, predictable URLs. Below are the key endpoints:

**Authentication**
- `POST /api/auth/signup` – Register a new user.
- `POST /api/auth/login` – Log in and receive access & refresh tokens.
- `POST /api/auth/refresh` – Exchange a refresh token for a new access token.
- `POST /api/auth/logout` – Invalidate the current refresh token.

**Products & Price Schemes**
- `GET /api/products` – List all products.
- `POST /api/products` – Create a new product (Admin only).
- `GET /api/products/:id` – Get details of a single product.
- `PUT /api/products/:id` – Update product details.
- `DELETE /api/products/:id` – Remove a product.

- `GET /api/price-schemes` – List all price schemes.
- `POST /api/price-schemes` – Create a new price scheme.
- `PUT /api/price-schemes/:id` – Update a scheme.
- `DELETE /api/price-schemes/:id` – Delete a scheme.

**Transactions (Sales)**
- `POST /api/transactions` – Record a sale (uses a database transaction to update stock).
- `GET /api/transactions` – List recent transactions.

**Bulk Data I/O**
- `POST /api/import` – Upload CSV to bulk create products or prices (streamed parsing).
- `GET /api/export` – Download CSV of current data.

**Webhooks & Real-Time**
- `POST /api/webhooks/flip` – Receive Flip.id events (HMAC-verified).
- `GET /api/health` – Basic health check for uptime monitoring.
- **Socket.io Namespace** `/stock-updates` – Clients subscribe to live stock levels.

## 5. Hosting Solutions

We recommend a cloud-based container approach:

- **Application Server**: Docker container running Bun + Express on AWS Elastic Container Service (ECS) or on a DigitalOcean App Platform.
- **Database**: MongoDB Atlas (managed database) for automated backups, scaling, and high availability.
- **Redis**: Managed Redis instance (AWS ElastiCache or DigitalOcean Managed Databases) for BullMQ queues and Socket.io adapter.
- **Domain & SSL**: Managed by a CDN provider (e.g., Cloudflare) for HTTPS, DNS, and basic WAF.

**Benefits**
- **Reliability** through managed services with agreement on uptime.
- **Scalability** by increasing container counts or database tier with minimal downtime.
- **Cost-Effectiveness** by paying only for resources used and leveraging free tiers during development.

## 6. Infrastructure Components

**Load Balancer**
- AWS Application Load Balancer (or DigitalOcean Load Balancer) distributes incoming HTTP and WebSocket connections across multiple container instances.

**Caching & Queuing**
- **Redis** acts as both the message broker for BullMQ and as a cache for frequently accessed lookups (e.g., product lists).
- **BullMQ** manages background jobs such as low-stock alerts and CSV imports.

**Content Delivery Network (CDN)**
- Cloudflare (or AWS CloudFront) caches static assets and the Next.js front end, speeding up global delivery.

**Reverse Proxy**
- Nginx or Traefik in front of the Express service handles routing, TLS termination, and graceful rolling updates.

## 7. Security Measures

**Authentication & Authorization**
- JWT Access and Refresh tokens signed with a strong secret.
- Role-based guards (Owner, Admin, Sales) enforce permissions on each endpoint.

**Data Encryption**
- TLS/HTTPS for all data in transit.
- MongoDB Atlas encryption at rest.

**HTTP Security**
- Helmet middleware for secure headers.
- Rate limiting (token bucket algorithm) to prevent brute-force attacks.
- CORS policy restricted to known front-end domains.

**Webhook Verification**
- HMAC signature check on Flip.id webhook payloads to ensure authenticity.

**Secret Management**
- Environment variables stored in a secrets manager (AWS Secrets Manager or DigitalOcean). 
- Zod-based validation at server startup ensures required secrets are present.

## 8. Monitoring and Maintenance

**Logging & Tracing**
- Winston logger with JSON output and correlation IDs passed through each request, socket event, and worker job.
- Optional integration with Sentry or DataDog for error tracking.

**Metrics & Alerts**
- Prometheus exporter collects metrics on HTTP latency, queue length, and job failures.
- Grafana dashboards visualize performance and trigger alerts on anomalies.

**Health Checks**
- `/api/health` endpoint polled by uptime monitors.
- Redis and MongoDB connections checked by background probes.

**Database Backups & Migrations**
- MongoDB Atlas automated daily backups with point-in-time restore.
- Prisma Migrate scripts version control schema changes and run safely in CI/CD.

## 9. Conclusion and Overall Backend Summary

The backend for the Distributor Application is designed for high performance, reliability, and ease of maintenance. By using Express.js on Bun, MongoDB with Prisma, and BullMQ for background processing, we achieve a scalable system that keeps user-facing endpoints fast and responsive. Security is enforced at every layer—from JWT and RBAC to encrypted webhooks—while a robust monitoring and alerting setup ensures we catch issues early. This architecture aligns closely with the project’s goals: supporting complex business logic, ensuring data integrity, and providing a solid foundation for future growth and feature expansion.