import { Router } from 'express';
import { approveVendor, adminDeleteProduct } from '../controllers/adminController';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

// Protect all admin endpoints with strict gatekeeping middleware
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

// PUT /api/admin/approve-vendor/1
router.put('/approve-vendor/:vendorId', approveVendor);

// DELETE /api/admin/products/5
router.delete('/products/:productId', adminDeleteProduct);

export default router;
