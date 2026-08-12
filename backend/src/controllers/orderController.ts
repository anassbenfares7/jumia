import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import pool, { query } from '../config/db';

export const createCheckoutOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  // Get an isolated database client instance out of our connection pool to run an atomic transaction
  const client = await pool.connect();
  
  try {
    const { items } = req.body; // Expected format: Array of { productId, quantity }

    // 1. Core structural guard checks
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication is required to proceed to checkout.' });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ status: 'error', message: 'Your checkout shopping cart session is currently empty.' });
      return;
    }

    // 2. Open an isolated SQL atomic transaction boundary block
    await client.query('BEGIN');

    let runningTotalCalculated = 0;
    const validatedProcessingItems: any[] = [];

    // 3. For each individual shopping item, verify live catalog data constraints
    for (const item of items) {
      const { productId, quantity } = item;

      if (!productId || !quantity || quantity <= 0) {
        throw new Error(`Invalid item quantities detected inside cart array payload.`);
      }

      // Fetch official price, stock thresholds, and owner vendor identities safely from the DB
      const productResult = await client.query(
        'SELECT id, vendor_id, price, stock, title FROM products WHERE id = $1 FOR UPDATE', 
        [productId]
      );

      if (productResult.rows.length === 0) {
        throw new Error(`Target catalog product ID ${productId} no longer exists in active systems.`);
      }

      const product = productResult.rows[0];

      // Inventory check: ensure the vendor has enough items remaining
      if (product.stock < quantity) {
        throw new Error(`Insufficient inventory stock for item "${product.title}". Requested: ${quantity}, Available: ${product.stock}`);
      }

      const extendedLineTotal = parseFloat(product.price) * quantity;
      runningTotalCalculated += extendedLineTotal;

      // Stage valid data arrays for writing to the database
      validatedProcessingItems.push({
        productId: product.id,
        vendorId: product.vendor_id,
        quantity,
        pricePerUnit: product.price
      });

      // Deduct inventory quantities instantly using safe database decrements
      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [quantity, productId]
      );
    }

    // 4. Create the parent master session order row
    const parentOrderResult = await client.query(
      `INSERT INTO orders (buyer_id, total_amount, payment_status, stripe_intent_id) 
       VALUES ($1, $2, 'completed', 'mock_sandbox_stripe_intent_id') 
       RETURNING id, buyer_id, total_amount, payment_status, created_at`,
      [req.user.id, runningTotalCalculated]
    );

    const createdParentOrderId = parentOrderResult.rows[0].id;

    // 5. Splitting action: Insert individual tracking rows mapped directly to their matching vendor owners
    for (const lineItem of validatedProcessingItems) {
      await client.query(
        `INSERT INTO order_items (order_id, vendor_id, product_id, quantity, price_per_unit, status) 
         VALUES ($1, $2, $3, $4, $5, 'placed')`,
        [createdParentOrderId, lineItem.vendorId, lineItem.productId, lineItem.quantity, lineItem.pricePerUnit]
      );
    }

    // 6. If everything passes securely, commit the transaction to make changes permanent in PostgreSQL
    await client.query('COMMIT');

    res.status(201).json({
      status: 'success',
      message: 'Checkout processed and split across corresponding vendors successfully!',
      data: {
        orderId: createdParentOrderId,
        totalPaid: runningTotalCalculated,
        paymentStatus: 'completed',
        summary: parentOrderResult.rows[0]
      }
    });

  } catch (error: any) {
    // Critical protection failure path: undo everything if any inner task breaks down
    await client.query('ROLLBACK');
    console.error('[Checkout Transaction Aborted]:', error.message);
    res.status(400).json({ status: 'error', message: error.message || 'Checkout execution failed.' });
  } finally {
    // Release the client back to the connection pool instantly
    client.release();
  }
};


export const getBuyerOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    // Secure parameterized query ensuring a customer only views their own records
    const buyerOrdersResult = await query(
      `SELECT o.id as order_id, o.total_amount, o.payment_status, o.created_at,
              oi.id as order_item_id, oi.quantity, oi.price_per_unit, oi.status as item_status,
              p.title as product_title, p.image_url, v.business_name
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       JOIN vendors v ON oi.vendor_id = v.id
       WHERE o.buyer_id = $1
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );

    res.status(200).json({
      status: 'success',
      data: buyerOrdersResult.rows
    });
  } catch (error) {
    console.error('[Get Buyer Orders Error]:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error fetching your purchase history.' });
  }
};
