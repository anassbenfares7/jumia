import { Router } from 'express';
import { 
  registerVendorProfile, 
  getVendorOrders, 
  updateVendorOrderItemStatus 
} from '../controllers/vendorController';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

// Protect all vendor routes with identity verification
router.use(authenticateToken);
router.use(authorizeRoles('vendor'));

// Profile management
router.post('/register-profile', registerVendorProfile);

// Order fulfillment and dashboard metrics
router.get('/orders', getVendorOrders);
router.put('/orders/:orderItemId/status', updateVendorOrderItemStatus);

export default router;
