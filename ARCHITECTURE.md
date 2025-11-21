# Distributor App Architecture

## System Overview

The Distributor Application is a full-stack, production-ready system for managing product distribution with advanced pricing schemes, inventory management, and point-of-sale capabilities. Built with **Bun** as the primary runtime for maximum performance.

## Tech Stack

### Core Technologies
- **Runtime**: Bun (Server, Build, Test, Package Manager)
- **Frontend**: Next.js 14+ (App Router) running on Bun
- **Backend**: Express.js running on Bun
- **Database**: MongoDB Atlas with Prisma v6+ ORM
- **Validation**: Zod (shared types between FE & BE)
- **Authentication**: JWT with Access/Refresh tokens
- **Real-time**: Socket.io for live updates
- **Queue/Job**: BullMQ + Redis for background processing
- **UI**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand + TanStack Query
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Containerization**: Docker with multi-stage builds
- **Logging**: Winston with structured JSON + correlation IDs

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend (Next.js)                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Dashboard     │  │   POS/Cart      │  │  Price Schemes  │ │
│  │   Components    │  │   Components    │  │   Management    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP/WebSocket
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Express.js)                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Controllers   │  │    Services     │  │   Middleware    │ │
│  │                 │  │                 │  │                 │ │
│  │ • Transaction   │  │ • Pricing       │  │ • Auth (JWT)    │ │
│  │ • PriceScheme   │  │ • Business      │  │ • RBAC          │ │
│  │ • Products      │  │   Logic         │  │ • Rate Limit    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Data Layer                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   MongoDB       │  │     Redis       │  │   BullMQ        │ │
│  │   (Prisma)      │  │   (Caching)     │  │   (Jobs)        │ │
│  │                 │  │                 │  │                 │ │
│  │ • Products      │  │ • Sessions      │  │ • Stock Alerts  │ │
│  │ • Transactions  │  │ • Rate Limits   │  │ • CSV Import    │ │
│  │ • PriceSchemes  │  │ • Socket.io     │  │ • Email Jobs    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Core Features

### 1. Advanced Pricing System
- **Cost Guard**: Prevents selling below cost price
- **Tiered Discounts**: Automatic discount application based on amount ranges
- **Real-time Calculation**: Instant price computation with validation
- **Scheme Management**: CRUD operations for pricing tiers
- **Formula**: `FinalPrice = OfferedPrice - floor(OfferedPrice × DiscountPercentage/100)`

### 2. Transaction Management
- **Atomic Operations**: All transactions use Prisma ACID transactions
- **Stock Management**: FIFO tracking with safety thresholds
- **Multi-warehouse Support**: Per-location inventory tracking
- **Payment Processing**: Support for various payment methods
- **Transaction Numbers**: Auto-generated unique identifiers

### 3. Authentication & Authorization
- **JWT-based**: Access (15min) + Refresh (7d) tokens
- **RBAC**: Role-based access control (Owner, Admin, Kasir, Sales)
- **Security**: Rate limiting, helmet, CORS, input validation
- **Session Management**: Secure token handling with rotation

### 4. Real-time Features
- **Socket.io Integration**: Live stock updates and order status
- **Background Jobs**: BullMQ for async processing
- **Notifications**: Low stock alerts and system events
- **Offline Support**: IndexedDB for POS functionality

## Database Schema

### Core Models

```typescript
// User Management
User {
  id, email, hashedPassword, role, isActive
  // Roles: OWNER, ADMIN_ENTRY, ADMIN_MANUAL, KASIR, SALES
}

// Product Catalog
Product {
  id, name, sku, costPrice, basePrice, stock, isActive
}

// Advanced Pricing
PriceScheme {
  minAmount, maxAmount, discountPercentage, isActive, note
}

// Transaction Processing
Transaction {
  transactionNumber, items[], totalAmount, finalAmount, paymentStatus
  // Includes atomic stock updates
}

// Inventory Management
Stock {
  productId, warehouseId, quantity, safetyThreshold
}

// Movement Tracking
StockMovement {
  productId, warehouseId, movementType, quantity, reason
}
```

## API Design

### RESTful Endpoints

#### Authentication
- `POST /api/auth/login` - User authentication
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/logout` - Session termination

#### Price Schemes
- `GET /api/price-schemes` - List all schemes
- `POST /api/price-schemes` - Create new scheme
- `PUT /api/price-schemes/:id` - Update scheme
- `DELETE /api/price-schemes/:id` - Deactivate scheme
- `POST /api/pricing/calculate` - Calculate price with discounts

#### Transactions
- `POST /api/transactions` - Create transaction (atomic)
- `GET /api/transactions` - List with pagination
- `GET /api/transactions/:id` - Get transaction details
- `PUT /api/transactions/:id` - Update payment status

#### System
- `GET /api/health` - Health check
- `WebSocket /socket.io` - Real-time updates

## Security Architecture

### Authentication Flow
1. User sends credentials to `/api/auth/login`
2. Server validates credentials via Prisma
3. Returns JWT access (15min) + refresh (7d) tokens
4. Access token used for API calls, refresh for renewal
5. Rate limiting prevents brute force attacks

### Authorization Model
- **Role Hierarchy**: OWNER > ADMIN_MANUAL > ADMIN_ENTRY > KASIR > SALES
- **Endpoint Protection**: Middleware-based RBAC checks
- **Data Isolation**: User-scoped data access

### Security Measures
- **Helmet**: Security headers
- **Rate Limiting**: Token bucket algorithm (100 req/15min)
- **Input Validation**: Zod schemas for all inputs
- **SQL Injection**: Prisma ORM prevents injection attacks
- **XSS Protection**: Content Security Policy headers
- **HTTPS Only**: Production-enforced SSL/TLS

## Performance Optimizations

### Backend Performance
- **Bun Runtime**: 2-3x faster than Node.js
- **Database Indexing**: Optimized queries on SKU, status, dates
- **Connection Pooling**: Prisma connection management
- **Caching**: Redis for frequently accessed data
- **Async Processing**: BullMQ for background jobs

### Frontend Performance
- **SSR/SSG**: Next.js server-side rendering
- **Code Splitting**: Automatic bundle optimization
- **Image Optimization**: Next.js Image component
- **Caching Strategy**: TanStack Query caching
- **Bundle Analysis**: Optimized with Bun bundler

## Deployment Architecture

### Container Strategy
```yaml
# Multi-container deployment
services:
  - mongodb:      # Database layer
  - redis:        # Caching + queue broker
  - api:          # Express.js backend
  - web:          # Next.js frontend
```

### Production Considerations
- **Load Balancing**: Nginx/Traefik reverse proxy
- **Scaling**: Horizontal scaling with Redis adapter
- **Monitoring**: Winston logs + correlation IDs
- **Health Checks**: Container health monitoring
- **Backup Strategy**: MongoDB Atlas automated backups

## Development Workflow

### Monorepo Structure
```
distributor-app/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Express.js backend
├── packages/         # Shared packages (future)
├── docker-compose.yml
├── Dockerfile
└── package.json      # Workspace config
```

### Development Commands
```bash
# Start both frontend and backend
bun run dev

# Database operations
bun run db:migrate    # Run migrations
bun run db:seed       # Seed test data

# Testing
bun run test          # Run all tests
bun run test:api      # API tests only
bun run test:web      # Frontend tests only
```

### Quality Assurance
- **Type Safety**: Strict TypeScript (noImplicitAny: true)
- **Linting**: ESLint with custom rules
- **Formatting**: Prettier with consistent style
- **Testing**: Vitest unit + Playwright E2E
- **Validation**: Zod schemas for all I/O

## Monitoring & Observability

### Logging Strategy
- **Structured Logs**: JSON format with correlation IDs
- **Log Levels**: error, warn, info, debug
- **Request Tracing**: End-to-end request tracking
- **Error Tracking**: Winston with stack traces

### Health Monitoring
- **Endpoint Health**: `/api/health` status checks
- **Database Connectivity**: Connection validation
- **Redis Health**: Cache availability checks
- **System Metrics**: Memory, CPU, response times

## Future Extensibility

### Planned Features
- **Multi-tenant Support**: Organization-based data isolation
- **Advanced Analytics**: Business intelligence dashboards
- **Mobile Apps**: React Native iOS/Android applications
- **API V2**: GraphQL API for complex queries
- **Microservices**: Service decomposition for scaling

### Scalability Considerations
- **Database Sharding**: MongoDB cluster scaling
- **CQRS Pattern**: Read/write separation
- **Event Sourcing**: Immutable event logs
- **Message Queues**: Kafka for high-throughput events
- **CDN Integration**: Global content delivery

---

This architecture provides a solid foundation for a production-ready distributor application with emphasis on performance, security, and maintainability while remaining flexible for future enhancements.