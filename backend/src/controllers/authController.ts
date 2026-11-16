import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';
import { env } from '../config/env';

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    // 1. Inputs Validation
    if (!name || !email || !password || !role) {
       res.status(400).json({ status: 'error', message: 'All fields (name, email, password, role) are mandatory.' });
       return;
    }

    // Strict role validation to prevent injection or privilege escalation attempts
    const validRoles = ['buyer', 'vendor'];
    if (!validRoles.includes(role)) {
       res.status(400).json({ status: 'error', message: 'Invalid registration role requested.' });
       return;
    }

    // 2. Business Logic: Check if email already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existingUser.rows.length > 0) {
       res.status(409).json({ status: 'error', message: 'An account with this email address already exists.' });
       return;
    }

    // 3. Security Layer: Cryptographically hash the raw password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 4. Persistence: Safe parameterized SQL insert
    const newUser = await query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
      [name.trim(), email.toLowerCase().trim(), hashedPassword, role]
    );

    // 5. Build JWT Payload
    const userPayload = {
      id: newUser.rows[0].id,
      email: newUser.rows[0].email,
      role: newUser.rows[0].role
    };

    const token = jwt.sign(userPayload, env.jwtSecret, { expiresIn: '24h' });

    // 6. Production Success Response (omitting password hash)
    res.status(201).json({
      status: 'success',
      message: 'User account provisioned successfully',
      data: {
        user: newUser.rows[0],
        token
      }
    });

  } catch (error) {
    console.error('[Register Error]:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error encountered during registration.' });
  }
};



export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // 1. Inputs Validation
    if (!email || !password) {
      res.status(400).json({ status: 'error', message: 'Email and password are required.' });
      return;
    }

    // 2. Fetch user by email
    const userResult = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userResult.rows.length === 0) {
      // Safe generic message to prevent user enumeration attacks
      res.status(401).json({ status: 'error', message: 'Invalid email or password.' });
      return;
    }

    const user = userResult.rows[0];

    // 3. Cryptographic comparison of password hash
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ status: 'error', message: 'Invalid email or password.' });
      return;
    }

    // 4. Build JWT Token Payload
    const userPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(userPayload, env.jwtSecret, { expiresIn: '24h' });

    // 5. Secure Production Response
    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          created_at: user.created_at
        },
        token
      }
    });

  } catch (error) {
    console.error('[Login Error]:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error encountered during login.' });
  }
};
