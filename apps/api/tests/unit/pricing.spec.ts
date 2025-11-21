import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PricingService } from '../../src/services/pricing.service';
import { prisma } from '../../src/config/database';

describe('PricingService', () => {
  let testProduct: any;
  let testSchemes: any[] = [];

  beforeEach(async () => {
    // Clean up existing test data
    await prisma.priceScheme.deleteMany({
      where: { note: { contains: 'TEST' } },
    });
    await prisma.product.deleteMany({
      where: { name: { contains: 'TEST' } },
    });

    // Create test product
    testProduct = await prisma.product.create({
      data: {
        name: 'TEST Product',
        sku: 'TEST-001',
        description: 'Test product for pricing',
        costPrice: 1000000, // 1 juta
        basePrice: 1200000, // 1.2 juta
        stock: 100,
        isActive: true,
      },
    });

    // Create test price schemes
    testSchemes = await Promise.all([
      prisma.priceScheme.create({
        data: {
          minAmount: 1000000,
          maxAmount: 1999999,
          discountPercentage: 1.0,
          isActive: true,
          note: 'TEST Tier 1 - 1%',
        },
      }),
      prisma.priceScheme.create({
        data: {
          minAmount: 2000000,
          maxAmount: 4999999,
          discountPercentage: 1.5,
          isActive: true,
          note: 'TEST Tier 2 - 1.5%',
        },
      }),
      prisma.priceScheme.create({
        data: {
          minAmount: 5000000,
          maxAmount: 9999999,
          discountPercentage: 2.0,
          isActive: true,
          note: 'TEST Tier 3 - 2%',
        },
      }),
    ]);
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.priceScheme.deleteMany({
      where: { note: { contains: 'TEST' } },
    });
    await prisma.product.deleteMany({
      where: { name: { contains: 'TEST' } },
    });
  });

  describe('computeFinalPrice', () => {
    it('should reject offered price below cost price', async () => {
      await expect(
        PricingService.computeFinalPrice(testProduct.id, 900000) // Below 1M cost price
      ).rejects.toThrow('Harga jual di bawah modal!');
    });

    it('should return no discount for amounts below first tier', async () => {
      const result = await PricingService.computeFinalPrice(testProduct.id, 500000);

      expect(result).toEqual({
        finalPrice: 500000,
        appliedSchemeId: null,
        discountAmount: 0,
        basePrice: testProduct.basePrice,
        costPrice: testProduct.costPrice,
        offeredPrice: 500000,
        scheme: null,
      });
    });

    it('should apply 1% discount for 1M amount', async () => {
      const offeredPrice = 1000000;
      const result = await PricingService.computeFinalPrice(testProduct.id, offeredPrice);

      const expectedDiscount = Math.floor(offeredPrice * 0.01); // 10,000
      const expectedFinalPrice = offeredPrice - expectedDiscount; // 990,000

      expect(result).toEqual({
        finalPrice: expectedFinalPrice,
        appliedSchemeId: testSchemes[0].id,
        discountAmount: expectedDiscount,
        basePrice: testProduct.basePrice,
        costPrice: testProduct.costPrice,
        offeredPrice,
        scheme: {
          minAmount: testSchemes[0].minAmount,
          maxAmount: testSchemes[0].maxAmount,
          discountPercentage: testSchemes[0].discountPercentage,
        },
      });
    });

    it('should apply 1.5% discount for 3M amount', async () => {
      const offeredPrice = 3000000;
      const result = await PricingService.computeFinalPrice(testProduct.id, offeredPrice);

      const expectedDiscount = Math.floor(offeredPrice * 0.015); // 45,000
      const expectedFinalPrice = offeredPrice - expectedDiscount; // 2,955,000

      expect(result).toEqual({
        finalPrice: expectedFinalPrice,
        appliedSchemeId: testSchemes[1].id,
        discountAmount: expectedDiscount,
        basePrice: testProduct.basePrice,
        costPrice: testProduct.costPrice,
        offeredPrice,
        scheme: {
          minAmount: testSchemes[1].minAmount,
          maxAmount: testSchemes[1].maxAmount,
          discountPercentage: testSchemes[1].discountPercentage,
        },
      });
    });

    it('should apply 2% discount for 5M amount', async () => {
      const offeredPrice = 5000000;
      const result = await PricingService.computeFinalPrice(testProduct.id, offeredPrice);

      const expectedDiscount = Math.floor(offeredPrice * 0.02); // 100,000
      const expectedFinalPrice = offeredPrice - expectedDiscount; // 4,900,000

      expect(result).toEqual({
        finalPrice: expectedFinalPrice,
        appliedSchemeId: testSchemes[2].id,
        discountAmount: expectedDiscount,
        basePrice: testProduct.basePrice,
        costPrice: testProduct.costPrice,
        offeredPrice,
        scheme: {
          minAmount: testSchemes[2].minAmount,
          maxAmount: testSchemes[2].maxAmount,
          discountPercentage: testSchemes[2].discountPercentage,
        },
      });
    });

    it('should handle edge case exactly at tier boundary', async () => {
      const offeredPrice = 1999999; // Just under 2M
      const result = await PricingService.computeFinalPrice(testProduct.id, offeredPrice);

      // Should still get 1% discount (tier 1)
      expect(result.discountAmount).toBe(Math.floor(offeredPrice * 0.01));
      expect(result.appliedSchemeId).toBe(testSchemes[0].id);
    });

    it('should throw error for non-existent product', async () => {
      await expect(
        PricingService.computeFinalPrice('non-existent-id', 1000000)
      ).rejects.toThrow('Product not found or inactive');
    });

    it('should handle inactive product', async () => {
      // Deactivate the test product
      await prisma.product.update({
        where: { id: testProduct.id },
        data: { isActive: false },
      });

      await expect(
        PricingService.computeFinalPrice(testProduct.id, 1000000)
      ).rejects.toThrow('Product not found or inactive');
    });
  });

  describe('createPriceScheme', () => {
    it('should create a new price scheme', async () => {
      const schemeData = {
        minAmount: 8000000,
        maxAmount: 12000000,
        discountPercentage: 2.5,
        isActive: true,
        note: 'TEST High tier - 2.5%',
      };

      const result = await PricingService.createPriceScheme(schemeData);

      expect(result).toMatchObject(schemeData);
      expect(result.id).toBeDefined();
    });

    it('should reject overlapping ranges', async () => {
      const overlappingScheme = {
        minAmount: 1500000, // Overlaps with 1M-2M tier
        maxAmount: 2500000,
        discountPercentage: 1.2,
        note: 'TEST Overlapping scheme',
      };

      await expect(
        PricingService.createPriceScheme(overlappingScheme)
      ).rejects.toThrow('overlaps with requested range');
    });

    it('should reject invalid ranges', async () => {
      const invalidScheme = {
        minAmount: 5000000,
        maxAmount: 4000000, // max < min
        discountPercentage: 1.0,
        note: 'TEST Invalid range',
      };

      await expect(
        PricingService.createPriceScheme(invalidScheme)
      ).rejects.toThrow('minAmount must be less than maxAmount');
    });
  });

  describe('updatePriceScheme', () => {
    it('should update existing price scheme', async () => {
      const updateData = {
        discountPercentage: 1.2,
        note: 'TEST Updated tier 1 - 1.2%',
      };

      const result = await PricingService.updatePriceScheme(testSchemes[0].id, updateData);

      expect(result.discountPercentage).toBe(updateData.discountPercentage);
      expect(result.note).toBe(updateData.note);
    });

    it('should reject non-existent scheme', async () => {
      await expect(
        PricingService.updatePriceScheme('non-existent-id', { discountPercentage: 1.0 })
      ).rejects.toThrow('Price scheme not found');
    });
  });

  describe('validateProductPricing', () => {
    it('should validate product with correct pricing', async () => {
      const validation = await PricingService.validateProductPricing(testProduct.id);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect base price below cost price', async () => {
      // Update product to have invalid pricing
      await prisma.product.update({
        where: { id: testProduct.id },
        data: { basePrice: 800000 }, // Below cost price of 1M
      });

      const validation = await PricingService.validateProductPricing(testProduct.id);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain(
        expect.stringContaining('Base price (800000) must be greater than cost price (1000000)')
      );
    });

    it('should handle non-existent product', async () => {
      const validation = await PricingService.validateProductPricing('non-existent-id');

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Product not found');
    });
  });
});