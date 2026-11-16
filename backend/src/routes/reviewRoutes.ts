import { Router } from 'express';
import { addProductReview, getProductReviews } from '../controllers/reviewController';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

// Public Route: Anyone can view reviews for an item
router.get('/product/:productId', getProductReviews);

// Protected Route: Only authenticated buyers who bought the item can leave reviews
router.post('/', authenticateToken, authorizeRoles('buyer'), addProductReview);

export default router;
