import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { query } from '../config/db';

// Approve a vendor to allow them to sell products
export const approveVendor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { vendorId } = req.params;

    if (!vendorId) {
      res.status(400).json({ status: 'error', message: 'Vendor parameter ID is required.' });
      return;
    }

    // Update the approval flag inside the database
    const updateResult = await query(
      'UPDATE vendors SET is_approved = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [vendorId]
    );

    if (updateResult.rows.length === 0) {
      res.status(404).json({ status: 'error', message: 'Vendor profile not found.' });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: `Vendor business "${updateResult.rows[0].business_name}" approved successfully.`,
      data: updateResult.rows[0]
    });

  } catch (error) {
    console.error('[Admin Vendor Approval Error]:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error during vendor approval.' });
  }
};

// Administrative moderation: Hard delete a product from the catalog
export const adminDeleteProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;

    const deleteResult = await query(
      'DELETE FROM products WHERE id = $1 RETURNING id, title',
      [productId]
    );

    if (deleteResult.rows.length === 0) {
      res.status(404).json({ status: 'error', message: 'Target product not found.' });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: `Product ID ${productId} (${deleteResult.rows[0].title}) deleted successfully by administrator moderation.`
    });

  } catch (error) {
    console.error('[Admin Delete Product Error]:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error during product moderation.' });
  }
};
