import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { query } from '../config/db';

export const registerVendorProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { businessName, phoneNumber } = req.body;

    // 1. Double check the user payload exists from our auth middleware
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication credentials missing.' });
      return;
    }

    // 2. Security validation: Ensure the authenticated user actually has the 'vendor' role
    if (req.user.role !== 'vendor') {
      res.status(403).json({ status: 'error', message: 'Access denied. Account role is not configured as a vendor.' });
      return;
    }

    // 3. Inputs validation
    if (!businessName || !phoneNumber) {
      res.status(400).json({ status: 'error', message: 'Business name and contact phone number are required.' });
      return;
    }

    // 4. Check if this user already has an active vendor profile
    const existingProfile = await query('SELECT id FROM vendors WHERE user_id = $1', [req.user.id]);
    if (existingProfile.rows.length > 0) {
      res.status(409).json({ status: 'error', message: 'A vendor profile is already registered to this account.' });
      return;
    }

    // 5. Check if the business name is taken
    const duplicateName = await query('SELECT id FROM vendors WHERE business_name = $1', [businessName.trim()]);
    if (duplicateName.rows.length > 0) {
      res.status(409).json({ status: 'error', message: 'This business name is already taken.' });
      return;
    }

    // 6. Safe parameterized insertion (Default is_approved will be false until Admin confirms it)
    const newVendor = await query(
      'INSERT INTO vendors (user_id, business_name, phone_number) VALUES ($1, $2, $3) RETURNING id, user_id, business_name, phone_number, is_approved, created_at',
      [req.user.id, businessName.trim(), phoneNumber.trim()]
    );

    res.status(201).json({
      status: 'success',
      message: 'Vendor profile initialized successfully. Awaiting administrator approval.',
      data: newVendor.rows[0]
    });

  } catch (error) {
    console.error('[Register Vendor Profile Error]:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error encountered while registering vendor details.' });
  }
};


// Fetch all order items belonging strictly to the logged-in vendor
export const getVendorOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    // Look up vendor profile to get vendor_id
    const vendorResult = await query('SELECT id FROM vendors WHERE user_id = $1', [req.user.id]);
    if (vendorResult.rows.length === 0) {
      res.status(403).json({ status: 'error', message: 'Access denied. Vendor profile not found.' });
      return;
    }
    const vendorId = vendorResult.rows[0].id;

    // Fetch granular items, matching product names and buyer details
    const vendorItems = await query(
      `SELECT oi.id as order_item_id, oi.quantity, oi.price_per_unit, oi.status, 
              p.title as product_title, o.created_at, u.name as buyer_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN orders o ON oi.order_id = o.id
       JOIN users u ON o.buyer_id = u.id
       WHERE oi.vendor_id = $1
       ORDER BY o.created_at DESC`,
      [vendorId]
    );

    res.status(200).json({
      status: 'success',
      data: vendorItems.rows
    });
  } catch (error) {
    console.error('[Get Vendor Orders Error]:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error fetching orders.' });
  }
};

// Update fulfillment status for a specific item owned by this vendor
export const updateVendorOrderItemStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { orderItemId } = req.params;
    const { status } = req.body; // e.g. 'confirmed', 'shipped', 'delivered'

    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    const validStatuses = ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ status: 'error', message: 'Invalid order status transition requested.' });
      return;
    }

    // Fetch vendor profile
    const vendorResult = await query('SELECT id FROM vendors WHERE user_id = $1', [req.user.id]);
    if (vendorResult.rows.length === 0) {
      res.status(403).json({ status: 'error', message: 'Access denied. Vendor profile not found.' });
      return;
    }
    const vendorId = vendorResult.rows[0].id;

    // Secure Update: Only update the row if it actually belongs to this specific vendor
    const updateResult = await query(
      `UPDATE order_items 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND vendor_id = $3 
       RETURNING *`,
      [status, orderItemId, vendorId]
    );

    if (updateResult.rows.length === 0) {
      res.status(404).json({ status: 'error', message: 'Order item not found or unauthorized.' });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: `Fulfillment status updated to ${status} successfully.`,
      data: updateResult.rows[0]
    });
  } catch (error) {
    console.error('[Update Order Item Error]:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error updating status.' });
  }
};

