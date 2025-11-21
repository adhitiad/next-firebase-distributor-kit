import { z } from 'zod';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

// Price calculation input schema
export const PriceCalculationSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  offeredPrice: z.number().positive('Offered price must be positive'),
});

// Price calculation result interface
export interface PriceCalculationResult {
  finalPrice: number;
  appliedSchemeId: string | null;
  discountAmount: number;
  basePrice: number;
  costPrice: number;
  offeredPrice: number;
  scheme: {
    minAmount: number;
    maxAmount: number;
    discountPercentage: number;
  } | null;
}

// Price scheme validation schema
export const PriceSchemeSchema = z.object({
  minAmount: z.number().min(0, 'Minimum amount must be non-negative'),
  maxAmount: z.number().positive('Maximum amount must be positive'),
  discountPercentage: z.number().min(0).max(100, 'Discount must be between 0 and 100'),
  isActive: z.boolean().default(true),
  note: z.string().optional(),
});

export type CreatePriceSchemeInput = z.infer<typeof PriceSchemeSchema>;

/**
 * Core pricing service with cost guard validation and tiered discount calculations
 */
export class PricingService {
  /**
   * Calculate final price with discount based on offered price and active price schemes
   *
   * @param product - Product information including cost and base price
   * @param offeredPrice - The price being offered by customer
   * @returns Final price calculation result
   *
   * @throws Error if offered price is below cost price (Cost Guard)
   */
  static async computeFinalPrice(
    productId: string,
    offeredPrice: number
  ): Promise<PriceCalculationResult> {
    logger.info('Calculating final price', {
      productId,
      offeredPrice,
    });

    // Validate input
    PriceCalculationSchema.parse({ productId, offeredPrice });

    // Get product information
    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        costPrice: true,
        basePrice: true,
      },
    });

    if (!product) {
      throw new Error('Product not found or inactive');
    }

    const { costPrice, basePrice } = product;

    // COST GUARD: Prevent selling below cost price
    if (offeredPrice < costPrice) {
      logger.warn('Attempted to sell below cost price', {
        productId,
        offeredPrice,
        costPrice,
        productSku: product.sku,
      });
      throw new Error('Harga jual di bawah modal!');
    }

    // Find matching price scheme
    const appliedScheme = await this.findMatchingPriceScheme(offeredPrice);

    let discountAmount = 0;
    let finalPrice = offeredPrice;
    let scheme: PriceCalculationResult['scheme'] = null;
    let appliedSchemeId: string | null = null;

    if (appliedScheme) {
      // Calculate discount using floor function
      discountAmount = Math.floor(offeredPrice * (appliedScheme.discountPercentage / 100));
      finalPrice = offeredPrice - discountAmount;

      scheme = {
        minAmount: appliedScheme.minAmount,
        maxAmount: appliedScheme.maxAmount,
        discountPercentage: appliedScheme.discountPercentage,
      };
      appliedSchemeId = appliedScheme.id;

      logger.info('Applied price scheme', {
        productId,
        offeredPrice,
        discountAmount,
        finalPrice,
        scheme: appliedScheme.discountPercentage,
      });
    } else {
      logger.info('No price scheme applied', {
        productId,
        offeredPrice,
        finalPrice: offeredPrice,
      });
    }

    const result: PriceCalculationResult = {
      finalPrice,
      appliedSchemeId,
      discountAmount,
      basePrice,
      costPrice,
      offeredPrice,
      scheme,
    };

    return result;
  }

  /**
   * Find active price scheme that matches the offered amount range
   */
  private static async findMatchingPriceScheme(amount: number) {
    return await prisma.priceScheme.findFirst({
      where: {
        isActive: true,
        minAmount: {
          lte: amount, // amount >= minAmount
        },
        maxAmount: {
          gte: amount, // amount <= maxAmount
        },
      },
      orderBy: [
        { maxAmount: 'asc' }, // Prefer the smallest range that fits
      ],
    });
  }

  /**
   * Create a new price scheme
   */
  static async createPriceScheme(data: CreatePriceSchemeInput): Promise<any> {
    logger.info('Creating price scheme', data);

    const validatedData = PriceSchemeSchema.parse(data);

    // Validate range logic
    if (validatedData.minAmount >= validatedData.maxAmount) {
      throw new Error('minAmount must be less than maxAmount');
    }

    // Check for overlapping ranges
    const existingScheme = await prisma.priceScheme.findFirst({
      where: {
        isActive: true,
        AND: [
          {
            minAmount: {
              lt: validatedData.maxAmount, // existing min < new max
            },
          },
          {
            maxAmount: {
              gt: validatedData.minAmount, // existing max > new min
            },
          },
        ],
      },
    });

    if (existingScheme) {
      throw new Error(
        `Price scheme range (${existingScheme.minAmount} - ${existingScheme.maxAmount}) overlaps with requested range (${validatedData.minAmount} - ${validatedData.maxAmount})`
      );
    }

    const priceScheme = await prisma.priceScheme.create({
      data: validatedData,
    });

    logger.info('Price scheme created successfully', {
      schemeId: priceScheme.id,
      range: `${validatedData.minAmount} - ${validatedData.maxAmount}`,
      discount: `${validatedData.discountPercentage}%`,
    });

    return priceScheme;
  }

  /**
   * Get all active price schemes
   */
  static async getPriceSchemes(): Promise<any[]> {
    return await prisma.priceScheme.findMany({
      where: { isActive: true },
      orderBy: [
        { minAmount: 'asc' },
      ],
    });
  }

  /**
   * Update a price scheme
   */
  static async updatePriceScheme(
    id: string,
    data: Partial<CreatePriceSchemeInput>
  ): Promise<any> {
    logger.info('Updating price scheme', { id, data });

    if (data.minAmount !== undefined || data.maxAmount !== undefined) {
      // Get current scheme
      const currentScheme = await prisma.priceScheme.findUnique({
        where: { id },
      });

      if (!currentScheme) {
        throw new Error('Price scheme not found');
      }

      const newMinAmount = data.minAmount ?? currentScheme.minAmount;
      const newMaxAmount = data.maxAmount ?? currentScheme.maxAmount;

      if (newMinAmount >= newMaxAmount) {
        throw new Error('minAmount must be less than maxAmount');
      }

      // Check for overlapping ranges (excluding current scheme)
      const existingScheme = await prisma.priceScheme.findFirst({
        where: {
          isActive: true,
          id: { not: id },
          AND: [
            {
              minAmount: {
                lt: newMaxAmount,
              },
            },
            {
              maxAmount: {
                gt: newMinAmount,
              },
            },
          ],
        },
      });

      if (existingScheme) {
        throw new Error(
          `Price scheme range (${existingScheme.minAmount} - ${existingScheme.maxAmount}) overlaps with requested range (${newMinAmount} - ${newMaxAmount})`
        );
      }
    }

    const updatedScheme = await prisma.priceScheme.update({
      where: { id },
      data,
    });

    logger.info('Price scheme updated successfully', {
      schemeId: id,
      updatedFields: Object.keys(data),
    });

    return updatedScheme;
  }

  /**
   * Delete (deactivate) a price scheme
   */
  static async deletePriceScheme(id: string): Promise<void> {
    logger.info('Deactivating price scheme', { id });

    const scheme = await prisma.priceScheme.findUnique({
      where: { id },
    });

    if (!scheme) {
      throw new Error('Price scheme not found');
    }

    await prisma.priceScheme.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info('Price scheme deactivated successfully', { schemeId: id });
  }

  /**
   * Validate pricing rules for a product
   */
  static async validateProductPricing(productId: string): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        costPrice: true,
        basePrice: true,
        sku: true,
      },
    });

    if (!product) {
      return { isValid: false, issues: ['Product not found'] };
    }

    // Check base price vs cost price
    if (product.basePrice <= product.costPrice) {
      issues.push(`Base price (${product.basePrice}) must be greater than cost price (${product.costPrice})`);
    }

    // Check for price schemes that might cause issues
    const schemes = await prisma.priceScheme.findMany({
      where: { isActive: true },
      orderBy: { minAmount: 'asc' },
    });

    // Check for gaps or overlaps in price schemes
    for (let i = 0; i < schemes.length - 1; i++) {
      const current = schemes[i];
      const next = schemes[i + 1];

      if (current.maxAmount >= next.minAmount) {
        issues.push(`Overlap detected: Scheme ${current.id} and ${next.id} have overlapping ranges`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }
}

export default PricingService;