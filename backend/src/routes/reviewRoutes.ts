import { Router } from 'express';
import { addProductReview, getProductReviews } from '../controllers/reviewController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Public Route: Anyone can view reviews for an item
router.get('/product/:productId', getProductReviews);

// Protected Route: Only authenticated buyers who bought the item can leave reviews
router.post('/', authenticateToken, addProductReview);

export default router;
