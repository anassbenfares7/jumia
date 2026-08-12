import { Router } from 'express';
import { registerUser, loginUser } from '../controllers/authController';

const router = Router();

// Route for account creation
router.post('/register', registerUser);

// Route for authenticating existing users
router.post('/login', loginUser);

export default router;
