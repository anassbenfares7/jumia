import { Router } from 'express';
import { 
  registerVendorProfile, 
  getVendorProfile,
  getVendorProducts,
  getVendorOrders, 
  updateVendorOrderItemStatus 
} from '../controllers/vendorController';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

// Protect all vendor routes with identity verification
router.use(authenticateToken);
router.use(authorizeRoles('vendor'));

// Profile management
router.get('/profile', getVendorProfile);
router.post('/register-profile', registerVendorProfile);
router.get('/products', getVendorProducts);

// Order fulfillment and dashboard metrics
router.get('/orders', getVendorOrders);
router.put('/orders/:orderItemId/status', updateVendorOrderItemStatus);

export default router;
