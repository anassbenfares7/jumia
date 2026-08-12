import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { query } from '../config/db';

// Submit a new product rating and review text
export const addProductReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { productId, rating, comment } = req.body;

    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    // 1. Input validation structural checks
    if (!productId || !rating || !comment) {
      res.status(400).json({ status: 'error', message: 'Missing required review payload entries.' });
      return;
    }

    const numericRating = parseInt(rating);
    if (numericRating < 1 || numericRating > 5) {
      res.status(400).json({ status: 'error', message: 'Review ratings must be an integer between 1 and 5.' });
      return;
    }

    // 2. Verified check: Verify if the buyer actually bought the item first (Jumia Verified Purchase standard)
    const verificationCheck = await query(
      `SELECT oi.id FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.buyer_id = $1 AND oi.product_id = $2`,
      [req.user.id, productId]
    );

    if (verificationCheck.rows.length === 0) {
      res.status(403).json({ 
        status: 'error', 
        message: 'Access denied. You can only leave reviews on items you have actually purchased.' 
      });
      return;
    }

    // 3. Persistent parameterized insertion
    const reviewResult = await query(
      `INSERT INTO reviews (user_id, product_id, rating, comment) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, user_id, product_id, rating, comment, created_at`,
      [req.user.id, productId, numericRating, comment.trim()]
    );

    res.status(201).json({
      status: 'success',
      message: 'Your product review was published successfully!',
      data: reviewResult.rows[0]
    });

  } catch (error: any) {
    // Catch database unique constraint collisions (Unique user + product review breaker)
    if (error.code === '23505') {
      res.status(409).json({ status: 'error', message: 'You have already submitted a review for this product.' });
      return;
    }
    console.error('[Add Review Error]:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error submitting review details.' });
  }
};

// Fetch public list of reviews for an item to display on the details sheet
export const getProductReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;

    const reviewsResult = await query(
      `SELECT r.id, r.rating, r.comment, r.created_at, u.name as reviewer_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC`,
      [productId]
    );

    res.status(200).json({
      status: 'success',
      data: reviewsResult.rows
    });
  } catch (error) {
    console.error('[Get Reviews Error]:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error extracting review metrics.' });
  }
};
