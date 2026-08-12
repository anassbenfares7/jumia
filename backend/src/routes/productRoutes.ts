import { Router } from 'express';
import { getAllProducts, createProduct } from '../controllers/productController';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

// Public Route: Anyone can view or browse products
router.get('/', getAllProducts);

// Protected Route: Only authenticated and verified vendors can upload new products
router.post(
  '/', 
  authenticateToken, 
  authorizeRoles('vendor'), 
  createProduct
);

export default router;
