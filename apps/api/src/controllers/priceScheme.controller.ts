import { Request, Response } from 'express';
import { PricingService } from '../services/pricing.service';
import { logger } from '../config/logger';

export class PriceSchemeController {
  /**
   * Get all price schemes
   */
  static async getPriceSchemes(req: Request, res: Response): Promise<void> {
    const schemeLogger = req.logger || logger;

    try {
      const schemes = await PricingService.getPriceSchemes();

      schemeLogger.info('Retrieved price schemes', {
        count: schemes.length,
      });

      res.json({
        success: true,
        data: { schemes },
      });

    } catch (error) {
      schemeLogger.error('Failed to retrieve price schemes', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        error: 'Failed to retrieve price schemes',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Create a new price scheme
   */
  static async createPriceScheme(req: Request, res: Response): Promise<void> {
    const schemeLogger = req.logger || logger;

    try {
      const scheme = await PricingService.createPriceScheme(req.body);

      schemeLogger.info('Price scheme created successfully', {
        schemeId: scheme.id,
        createdBy: req.user?.id,
      });

      res.status(201).json({
        success: true,
        data: { scheme },
      });

    } catch (error) {
      schemeLogger.error('Failed to create price scheme', {
        error: error instanceof Error ? error.message : 'Unknown error',
        data: req.body,
        createdBy: req.user?.id,
      });

      res.status(400).json({
        error: 'Failed to create price scheme',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Update a price scheme
   */
  static async updatePriceScheme(req: Request, res: Response): Promise<void> {
    const schemeLogger = req.logger || logger;

    try {
      const { id } = req.params;
      const updatedScheme = await PricingService.updatePriceScheme(id, req.body);

      schemeLogger.info('Price scheme updated successfully', {
        schemeId: id,
        updatedBy: req.user?.id,
      });

      res.json({
        success: true,
        data: { scheme: updatedScheme },
      });

    } catch (error) {
      schemeLogger.error('Failed to update price scheme', {
        schemeId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: req.body,
        updatedBy: req.user?.id,
      });

      res.status(400).json({
        error: 'Failed to update price scheme',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Delete (deactivate) a price scheme
   */
  static async deletePriceScheme(req: Request, res: Response): Promise<void> {
    const schemeLogger = req.logger || logger;

    try {
      const { id } = req.params;
      await PricingService.deletePriceScheme(id);

      schemeLogger.info('Price scheme deleted successfully', {
        schemeId: id,
        deletedBy: req.user?.id,
      });

      res.status(200).json({
        success: true,
        message: 'Price scheme deleted successfully',
      });

    } catch (error) {
      schemeLogger.error('Failed to delete price scheme', {
        schemeId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        deletedBy: req.user?.id,
      });

      res.status(400).json({
        error: 'Failed to delete price scheme',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Calculate price for a product with offered price
   */
  static async calculatePrice(req: Request, res: Response): Promise<void> {
    const schemeLogger = req.logger || logger;

    try {
      const { productId, offeredPrice } = req.body;

      if (!productId || !offeredPrice) {
        res.status(400).json({
          error: 'productId and offeredPrice are required',
        });
        return;
      }

      const result = await PricingService.computeFinalPrice(
        productId,
        parseFloat(offeredPrice)
      );

      schemeLogger.info('Price calculation completed', {
        productId,
        offeredPrice: parseFloat(offeredPrice),
        finalPrice: result.finalPrice,
        discountAmount: result.discountAmount,
        schemeApplied: result.appliedSchemeId !== null,
      });

      res.json({
        success: true,
        data: result,
      });

    } catch (error) {
      schemeLogger.error('Failed to calculate price', {
        error: error instanceof Error ? error.message : 'Unknown error',
        data: req.body,
      });

      res.status(400).json({
        error: 'Failed to calculate price',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Validate pricing for a product
   */
  static async validatePricing(req: Request, res: Response): Promise<void> {
    const schemeLogger = req.logger || logger;

    try {
      const { productId } = req.params;

      const validation = await PricingService.validateProductPricing(productId);

      schemeLogger.info('Pricing validation completed', {
        productId,
        isValid: validation.isValid,
        issueCount: validation.issues.length,
      });

      res.json({
        success: true,
        data: validation,
      });

    } catch (error) {
      schemeLogger.error('Failed to validate pricing', {
        productId: req.params.productId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        error: 'Failed to validate pricing',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default PriceSchemeController;