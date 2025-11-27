import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { PricingService } from '../services/pricing.service';
import { logger } from '../config/logger';

// Transaction item schema
const TransactionItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  offeredPrice: z.number().positive('Offered price must be positive'),
});

// Create transaction schema
const CreateTransactionSchema = z.object({
  items: z.array(TransactionItemSchema).min(1, 'At least one item is required'),
  customerId: z.string().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

// Update transaction status schema
const UpdateTransactionSchema = z.object({
  paymentStatus: z.enum(['PENDING', 'PAID', 'PARTIAL', 'FAILED', 'REFUNDED']),
  notes: z.string().optional(),
});

export class TransactionController {
  /**
   * Create a new transaction with atomic database operations
   */
  static async createTransaction(req: Request, res: Response): Promise<void> {
    const transactionLogger = req.logger || logger;

    try {
      // Validate input
      const validatedData = CreateTransactionSchema.parse(req.body);

      transactionLogger.info('Creating transaction', {
        itemCount: validatedData.items.length,
        customerId: validatedData.customerId,
      });

      // Calculate total amount and validate all items first
      const itemsWithPricing = [];
      let totalAmount = 0;

      for (const item of validatedData.items) {
        // Check product availability and get pricing
        const product = await prisma.product.findUnique({
          where: { id: item.productId, isActive: true },
          select: {
            id: true,
            name: true,
            sku: true,
            stock: true,
            costPrice: true,
            basePrice: true,
          },
        });

        if (!product) {
          res.status(404).json({
            error: `Product with ID ${item.productId} not found or inactive`,
          });
          return;
        }

        // Check stock availability
        if (product.stock < item.quantity) {
          res.status(400).json({
            error: `Insufficient stock for product ${product.sku}. Available: ${product.stock}, Requested: ${item.quantity}`,
          });
          return;
        }

        // Calculate pricing using PricingService
        const pricingResult = await PricingService.computeFinalPrice(
          item.productId,
          item.offeredPrice
        );

        const itemTotal = pricingResult.finalPrice * item.quantity;
        totalAmount += itemTotal;

        itemsWithPricing.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.offeredPrice,
          discountAmount: pricingResult.discountAmount * item.quantity,
          finalPrice: pricingResult.finalPrice,
          total: itemTotal,
          product: {
            name: product.name,
            sku: product.sku,
            costPrice: product.costPrice,
            basePrice: product.basePrice,
          },
          pricing: pricingResult,
        });
      }

      // Generate transaction number
      const transactionNumber = await TransactionController.generateTransactionNumber();

      // Perform atomic transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create transaction header
        const transaction = await tx.transaction.create({
          data: {
            transactionNumber,
            totalAmount,
            finalAmount: totalAmount,
            paymentStatus: 'PENDING',
            paymentMethod: validatedData.paymentMethod,
            performedBy: req.user!.id,
            customerId: validatedData.customerId,
            notes: validatedData.notes,
          },
        });

        // Create transaction items and update stock
        for (const item of itemsWithPricing) {
          // Create transaction item
          await tx.transactionItem.create({
            data: {
              transactionId: transaction.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountAmount: item.discountAmount,
              finalPrice: item.finalPrice,
            },
          });

          // Decrease product stock (atomic update)
          const updatedProduct = await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });

          // Create stock movement record
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              warehouseId: 'default', // TODO: Make this configurable
              movementType: 'OUT',
              quantity: -item.quantity, // Negative for outbound
              reason: `Transaction: ${transactionNumber}`,
            },
          });

          // Log stock movement
          transactionLogger.info('Stock updated', {
            productId: item.productId,
            productSku: item.product.sku,
            quantity: item.quantity,
            previousStock: updatedProduct.stock + item.quantity,
            newStock: updatedProduct.stock,
            transactionNumber,
          });

          // Check if stock is below safety threshold
          if (updatedProduct.stock <= 10) { // TODO: Make threshold configurable
            transactionLogger.warn('Low stock alert', {
              productId: item.productId,
              productSku: item.product.sku,
              currentStock: updatedProduct.stock,
              safetyThreshold: 10,
              transactionNumber,
            });

            // TODO: Queue background job for stock notification
            // await StockNotificationJob.queue({
            //   productId: item.productId,
            //   currentStock: updatedProduct.stock,
            //   threshold: 10,
            // });
          }
        }

        return transaction;
      });

      transactionLogger.info('Transaction created successfully', {
        transactionId: result.id,
        transactionNumber: result.transactionNumber,
        totalAmount: result.finalAmount,
        itemCount: itemsWithPricing.length,
      });

      // Fetch created transaction with items for response
      const transactionWithItems = await prisma.transaction.findUnique({
        where: { id: result.id },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        data: {
          transaction: transactionWithItems,
          items: itemsWithPricing.map(item => ({
            ...item,
            pricing: {
              finalPrice: item.pricing.finalPrice,
              discountAmount: item.pricing.discountAmount,
              appliedSchemeId: item.pricing.appliedSchemeId,
              scheme: item.pricing.scheme,
            },
          })),
        },
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }

      transactionLogger.error('Failed to create transaction', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      res.status(500).json({
        error: 'Failed to create transaction',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get transactions list with pagination
   */
  static async getTransactions(req: Request, res: Response): Promise<void> {
    const transactionLogger = req.logger || logger;

    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const skip = (page - 1) * limit;

      const whereClause: any = {};
      if (status) {
        whereClause.paymentStatus = status.toUpperCase();
      }

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where: whereClause,
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                  },
                },
              },
            },
            user: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.transaction.count({ where: whereClause }),
      ]);

      transactionLogger.info('Retrieved transactions', {
        page,
        limit,
        total,
        status,
      });

      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });

    } catch (error) {
      transactionLogger.error('Failed to retrieve transactions', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        error: 'Failed to retrieve transactions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get single transaction by ID
   */
  static async getTransaction(req: Request, res: Response): Promise<void> {
    const transactionLogger = req.logger || logger;

    try {
      const { id } = req.params;

      const transaction = await prisma.transaction.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  costPrice: true,
                  basePrice: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });

      if (!transaction) {
        res.status(404).json({
          error: 'Transaction not found',
        });
        return;
      }

      transactionLogger.info('Retrieved transaction', {
        transactionId: id,
        transactionNumber: transaction.transactionNumber,
      });

      res.json({
        success: true,
        data: { transaction },
      });

    } catch (error) {
      transactionLogger.error('Failed to retrieve transaction', {
        transactionId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        error: 'Failed to retrieve transaction',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Update transaction payment status
   */
  static async updateTransaction(req: Request, res: Response): Promise<void> {
    const transactionLogger = req.logger || logger;

    try {
      const { id } = req.params;
      const validatedData = UpdateTransactionSchema.parse(req.body);

      // Check if transaction exists
      const existingTransaction = await prisma.transaction.findUnique({
        where: { id },
      });

      if (!existingTransaction) {
        res.status(404).json({
          error: 'Transaction not found',
        });
        return;
      }

      // Update transaction
      const updatedTransaction = await prisma.transaction.update({
        where: { id },
        data: {
          paymentStatus: validatedData.paymentStatus,
          notes: validatedData.notes || existingTransaction.notes,
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
            },
          },
        },
      });

      transactionLogger.info('Transaction updated', {
        transactionId: id,
        transactionNumber: updatedTransaction.transactionNumber,
        previousStatus: existingTransaction.paymentStatus,
        newStatus: validatedData.paymentStatus,
      });

      res.json({
        success: true,
        data: { transaction: updatedTransaction },
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }

      transactionLogger.error('Failed to update transaction', {
        transactionId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        error: 'Failed to update transaction',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Generate unique transaction number
   */
  private static async generateTransactionNumber(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

    let sequence = 1;
    let transactionNumber: string;

    do {
      transactionNumber = `TXN${dateStr}${sequence.toString().padStart(4, '0')}`;

      const existing = await prisma.transaction.findUnique({
        where: { transactionNumber },
        select: { id: true },
      });

      if (!existing) {
        break;
      }

      sequence++;
    } while (sequence <= 9999);

    if (sequence > 9999) {
      throw new Error('Maximum transaction number reached for today');
    }

    return transactionNumber;
  }
}

export default TransactionController;