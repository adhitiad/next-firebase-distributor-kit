import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean existing data
  await prisma.transactionItem.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.priceScheme.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing data');

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 12);

  const owner = await prisma.user.create({
    data: {
      email: 'owner@distributor.com',
      hashedPassword,
      role: UserRole.OWNER,
      isActive: true,
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@distributor.com',
      hashedPassword,
      role: UserRole.ADMIN_MANUAL,
      isActive: true,
    },
  });

  const kasir = await prisma.user.create({
    data: {
      email: 'kasir@distributor.com',
      hashedPassword,
      role: UserRole.KASIR,
      isActive: true,
    },
  });

  const sales = await prisma.user.create({
    data: {
      email: 'sales@distributor.com',
      hashedPassword,
      role: UserRole.SALES,
      isActive: true,
    },
  });

  console.log('👥 Created users:', { owner: owner.email, admin: admin.email, kasir: kasir.email, sales: sales.email });

  // Create sample products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Laptop ASUS ROG',
        sku: 'LAPTOP-001',
        description: 'Gaming laptop with high performance',
        costPrice: 15000000, // 15 juta
        basePrice: 18000000, // 18 juta
        stock: 50,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Mouse Gaming Logitech',
        sku: 'MOUSE-001',
        description: 'Wireless gaming mouse',
        costPrice: 500000, // 500 ribu
        basePrice: 750000, // 750 ribu
        stock: 200,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Keyboard Mechanical',
        sku: 'KEYBOARD-001',
        description: 'RGB mechanical keyboard',
        costPrice: 800000, // 800 ribu
        basePrice: 1200000, // 1.2 juta
        stock: 100,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Monitor LG 27"',
        sku: 'MONITOR-001',
        description: '27 inch 4K monitor',
        costPrice: 3000000, // 3 juta
        basePrice: 4500000, // 4.5 juta
        stock: 30,
        isActive: true,
      },
    }),
  ]);

  console.log('📦 Created products:', products.map(p => ({ name: p.name, sku: p.sku, stock: p.stock })));

  // Create default price schemes (tiered discounts)
  const priceSchemes = await Promise.all([
    // Tier 1: 1-1.9 million = 1% discount
    prisma.priceScheme.create({
      data: {
        minAmount: 1000000,    // 1 juta
        maxAmount: 1900000,    // 1.9 juta
        discountPercentage: 1.0, // 1%
        isActive: true,
        note: 'Tier 1: Small purchases - 1% discount',
      },
    }),
    // Tier 2: 2-4.9 million = 1.4% discount
    prisma.priceScheme.create({
      data: {
        minAmount: 2000000,    // 2 juta
        maxAmount: 4900000,    // 4.9 juta
        discountPercentage: 1.4, // 1.4%
        isActive: true,
        note: 'Tier 2: Medium purchases - 1.4% discount',
      },
    }),
    // Tier 3: 5-9.9 million = 1.8% discount
    prisma.priceScheme.create({
      data: {
        minAmount: 5000000,    // 5 juta
        maxAmount: 9900000,    // 9.9 juta
        discountPercentage: 1.8, // 1.8%
        isActive: true,
        note: 'Tier 3: Large purchases - 1.8% discount',
      },
    }),
    // Tier 4: 10+ million = 2.5% discount
    prisma.priceScheme.create({
      data: {
        minAmount: 10000000,   // 10 juta
        maxAmount: 999999999,  // Very high max
        discountPercentage: 2.5, // 2.5%
        isActive: true,
        note: 'Tier 4: Very large purchases - 2.5% discount',
      },
    }),
  ]);

  console.log('💰 Created price schemes:', priceSchemes.map(s => ({
    range: `${(s.minAmount/1000000).toFixed(1)}-${(s.maxAmount/1000000).toFixed(1)}jt`,
    discount: `${s.discountPercentage}%`,
  })));

  // Create initial stock records
  const stocks = await Promise.all(
    products.map(product =>
      prisma.stock.create({
        data: {
          productId: product.id,
          warehouseId: 'WH-001', // Default warehouse
          quantity: product.stock,
          safetyThreshold: 10,
        },
      })
    )
  );

  console.log('📊 Created stock records:', stocks.length);

  // Create some sample transactions for testing
  await prisma.$transaction(async (tx) => {
    const transaction1 = await tx.transaction.create({
      data: {
        transactionNumber: 'TXN202411210001',
        totalAmount: 1825000, // 2,000,000 - 17,500 (1.4% discount on 2M)
        finalAmount: 1825000,
        paymentStatus: 'PAID',
        paymentMethod: 'CASH',
        performedBy: kasir.id,
        notes: 'Walk-in customer',
      },
    });

    // Add transaction items
    await tx.transactionItem.create({
      data: {
        transactionId: transaction1.id,
        productId: products[1].id, // Mouse
        quantity: 2,
        unitPrice: 1000000, // 1M each
        discountAmount: 14000, // 1.4% discount
        finalPrice: 986000, // 1M - 14k = 986k each
      },
    });

    // Update stock
    await tx.product.update({
      where: { id: products[1].id },
      data: { stock: { decrement: 2 } },
    });

    // Create stock movement
    await tx.stockMovement.create({
      data: {
        productId: products[1].id,
        warehouseId: 'WH-001',
        movementType: 'OUT',
        quantity: -2,
        reason: `Transaction: ${transaction1.transactionNumber}`,
      },
    });
  });

  console.log('🧾 Created sample transaction');

  console.log('✅ Database seeding completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`   👤 Users: 4 (Owner, Admin, Kasir, Sales)`);
  console.log(`   📦 Products: ${products.length}`);
  console.log(`   💰 Price Schemes: ${priceSchemes.length}`);
  console.log(`   📊 Stock Records: ${stocks.length}`);
  console.log('\n🔑 Login credentials (all use "password123"):');
  console.log(`   Owner: owner@distributor.com`);
  console.log(`   Admin: admin@distributor.com`);
  console.log(`   Kasir: kasir@distributor.com`);
  console.log(`   Sales: sales@distributor.com`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });