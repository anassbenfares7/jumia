import { Router } from 'express';
import { createCheckoutOrder, getBuyerOrders } from '../controllers/orderController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Secure all order routes with user identity verification
router.use(authenticateToken);

// Checkout processing
router.post('/checkout', createCheckoutOrder);

// Personal purchase history tracking timeline
router.get('/history', getBuyerOrders);

export default router;
