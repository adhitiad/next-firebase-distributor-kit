# 🏪 Distributor Application

A high-performance, production-ready distributor management system built with **Bun** runtime, featuring advanced pricing schemes, inventory management, and real-time point-of-sale capabilities.

## ✨ Key Features

### 🛒 **Advanced Pricing System**
- **Cost Guard Protection**: Prevents selling below cost price
- **Tiered Discounts**: Automatic discount application based on purchase amount
- **Real-time Calculations**: Instant price computation with validation
- **Flexible Schemes**: Easy CRUD management of pricing tiers

### 📦 **Inventory Management**
- **Multi-warehouse Support**: Track inventory across multiple locations
- **FIFO Tracking**: First-in, first-out stock movement
- **Safety Thresholds**: Automated low-stock alerts
- **Real-time Updates**: Live stock levels via Socket.io

### 💳 **Transaction Processing**
- **Atomic Operations**: ACID-compliant transaction handling
- **Multiple Payment Methods**: Support for cash, card, digital payments
- **Partial Payments**: Handle complex payment scenarios
- **Transaction History**: Complete audit trail with details

### 🔐 **Security & Authentication**
- **JWT-based Auth**: Access (15min) + Refresh (7d) tokens
- **Role-based Access**: Owner, Admin, Kasir, Sales roles
- **Advanced Security**: Rate limiting, helmet, CORS protection
- **Input Validation**: Comprehensive Zod schema validation

### ⚡ **Performance & Scalability**
- **Bun Runtime**: 2-3x faster than Node.js
- **Optimized Database**: MongoDB with strategic indexing
- **Caching Layer**: Redis for performance optimization
- **Background Jobs**: BullMQ for async processing

## 🚀 Quick Start

### Prerequisites
- **Bun** >= 1.0.0
- **MongoDB** (local or MongoDB Atlas)
- **Redis** (optional for advanced features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd distributor-app
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment variables**
   ```bash
   cp apps/api/.env.example apps/api/.env.local
   # Edit apps/api/.env.local with your configuration
   ```

4. **Set up database**
   ```bash
   # Generate Prisma client
   bun run db:generate

   # Run database migrations (when using MongoDB Atlas)
   bun run db:migrate

   # Seed initial data
   bun run db:seed
   ```

5. **Start development servers**
   ```bash
   # Start both frontend and backend
   bun run dev

   # Or start individually:
   bun run dev:api   # Backend on :3001
   bun run dev:web   # Frontend on :3000
   ```

### Using Docker

```bash
# Start all services (MongoDB, Redis, API, Web)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js Frontend (Port 3000)                │
│  • Dashboard Components  • POS/Cart  • Price Scheme Management  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP/WebSocket
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Express.js Backend (Port 3001)               │
│  • Transaction Controller  • Pricing Service  • Auth Middleware│
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Data Layer                               │
│  • MongoDB (Prisma)  • Redis (Cache)  • BullMQ (Jobs)         │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Database Schema

### Core Models

```typescript
// User Management
User {
  id, email, hashedPassword, role
  // Roles: OWNER, ADMIN_MANUAL, ADMIN_ENTRY, KASIR, SALES
}

// Product Catalog
Product {
  name, sku, costPrice, basePrice, stock, isActive
}

// Pricing Tiers
PriceScheme {
  minAmount, maxAmount, discountPercentage, isActive, note
}

// Transactions
Transaction {
  transactionNumber, items[], totalAmount, finalAmount, paymentStatus
}

// Inventory
Stock {
  productId, warehouseId, quantity, safetyThreshold
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Application
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL="mongodb://localhost:27017/distributor_app"

# JWT
JWT_SECRET="your-super-secret-jwt-key-min-32-characters"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-min-32-characters"

# Redis (optional)
REDIS_URL="redis://localhost:6379"

# CORS
FRONTEND_URL="http://localhost:3000"
```

## 🧪 Testing

```bash
# Run all tests
bun run test

# Run API tests only
bun run test:api

# Run frontend tests only
bun run test:web

# Run tests with coverage
bun run test --coverage
```

## 📝 API Documentation

### Authentication

```bash
# Login
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@distributor.com",
  "password": "password123"
}

# Response
{
  "accessToken": "jwt-token-here",
  "refreshToken": "refresh-token-here",
  "user": { "id": "...", "email": "...", "role": "..." }
}
```

### Price Calculation

```bash
# Calculate price with discounts
POST /api/pricing/calculate
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "productId": "product-uuid",
  "offeredPrice": 3000000
}

# Response
{
  "finalPrice": 2955000,
  "discountAmount": 45000,
  "appliedSchemeId": "scheme-uuid",
  "costPrice": 1500000,
  "basePrice": 1800000
}
```

### Create Transaction

```bash
# Create new transaction
POST /api/transactions
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "items": [
    {
      "productId": "product-uuid",
      "quantity": 2,
      "offeredPrice": 1000000
    }
  ],
  "paymentMethod": "CASH",
  "notes": "Walk-in customer"
}
```

## 🎯 Pricing Logic

The system implements tiered discount pricing with cost protection:

### Formula
```
FinalPrice = OfferedPrice - floor(OfferedPrice × DiscountPercentage/100)
```

### Example Tiers
- **Tier 1**: 1M - 1.9M → 1% discount
- **Tier 2**: 2M - 4.9M → 1.4% discount
- **Tier 3**: 5M - 9.9M → 1.8% discount
- **Tier 4**: 10M+ → 2.5% discount

### Cost Guard
- ❌ Selling below `costPrice` → **REJECTED** with error
- ✅ Selling above `costPrice` → **APPROVED** with applicable discount

## 🔒 Security Features

### Authentication & Authorization
- **JWT Tokens**: Short-lived access + long-lived refresh
- **Role Hierarchy**: Owner > Admin Manual > Admin Entry > Kasir > Sales
- **Endpoint Protection**: Middleware-based RBAC checks
- **Session Security**: Secure token storage and rotation

### Application Security
- **Rate Limiting**: 100 requests per 15 minutes
- **Input Validation**: Zod schemas for all inputs
- **SQL Injection Protection**: Prisma ORM prevents attacks
- **Security Headers**: Helmet middleware for OWASP compliance
- **HTTPS Enforcement**: Production SSL/TLS required

## 📈 Performance Monitoring

### Health Checks
```bash
# System health
GET /api/health

# Response
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

### Logging
- **Structured Logs**: JSON format with correlation IDs
- **Log Levels**: error, warn, info, debug
- **Request Tracing**: End-to-end request tracking
- **Error Tracking**: Comprehensive error logging

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   # Set production environment
   export NODE_ENV=production

   # Configure secrets
   export JWT_SECRET="production-secret-key"
   export DATABASE_URL="mongodb://production-host/db"
   ```

2. **Database Setup**
   ```bash
   # Run migrations
   bun run db:migrate

   # Seed initial data (optional)
   bun run db:seed
   ```

3. **Build & Deploy**
   ```bash
   # Build applications
   bun run build

   # Start production server
   bun run start
   ```

### Docker Deployment

```bash
# Build production images
docker build -t distributor-app .

# Run with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

## 🤝 Development Workflow

### Adding New Features

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/new-pricing-tier
   ```

2. **Backend Development**
   ```bash
   # Add new service in apps/api/src/services/
   # Add controller in apps/api/src/controllers/
   # Add routes in apps/api/src/app.ts
   # Add tests in apps/api/tests/
   ```

3. **Frontend Development**
   ```bash
   # Add components in apps/web/app/components/
   # Add pages in apps/web/app/
   # Add hooks in apps/web/app/hooks/
   ```

4. **Testing**
   ```bash
   # Run tests
   bun run test

   # Type checking
   bun run type-check
   ```

5. **Deployment**
   ```bash
   # Merge to main
   git checkout main
   git merge feature/new-pricing-tier

   # Deploy
   git push origin main
   ```

## 📚 Additional Documentation

- [**Architecture Guide**](./ARCHITECTURE.md) - Detailed system architecture
- [**API Reference**](./apps/api/docs/api.md) - Complete API documentation
- [**Database Schema**](./apps/api/prisma/schema.prisma) - Database models and relationships
- [**Security Guidelines**](./apps/web/documentation/security_guideline_document.md) - Security best practices

## 🆘 Troubleshooting

### Common Issues

**Database Connection Error**
```bash
# Check MongoDB connection
mongosh "mongodb://localhost:27017/distributor_app"

# Verify DATABASE_URL in .env.local
echo $DATABASE_URL
```

**Port Already in Use**
```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>
```

**Prisma Client Generation**
```bash
# Regenerate Prisma client
cd apps/api && bunx prisma generate
```

**Build Errors**
```bash
# Clear node_modules and reinstall
rm -rf node_modules apps/*/node_modules
bun install
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the [documentation](./documentation/)
- Review the [troubleshooting guide](#-troubleshooting)

---

**Built with ❤️ using Bun, Next.js, Express, MongoDB, and Prisma**
