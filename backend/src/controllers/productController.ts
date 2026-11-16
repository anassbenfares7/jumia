import { Request, Response } from 'express';
import { query } from '../config/db';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export const getProductCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await query('SELECT id, name, slug FROM categories ORDER BY name');
    res.status(200).json({ status: 'success', data: categories.rows });
  } catch (error) {
    console.error('[Get Product Categories Error]:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error fetching product categories.' });
  }
};

export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Extract query parameters with defensive defaults
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const categorySlug = req.query.category as string || null;
    const search = req.query.search as string || null;

    // Calculate database offset value for SQL pagination
    const offset = (page - 1) * limit;

    // 2. Dynamically build parameterized SQL query to avoid SQL Injection
    let sqlQuery = `
      SELECT p.*, c.name as category_name, v.business_name 
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN vendors v ON p.vendor_id = v.id
      WHERE 1=1
    `;
    
    const queryParams: any[] = [];
    let paramCounter = 1;

    // Append category filter if supplied
    if (categorySlug) {
      sqlQuery += ` AND c.slug = $${paramCounter}`;
      queryParams.push(categorySlug);
      paramCounter++;
    }

    // Append search filter if supplied (using ILIKE for case-insensitive matching)
    if (search) {
      sqlQuery += ` AND (p.title ILIKE $${paramCounter} OR p.description ILIKE $${paramCounter})`;
      queryParams.push(`%${search}%`);
      paramCounter++;
    }

    // Append pagination boundaries (Order by fresh items first)
    sqlQuery += ` ORDER BY p.created_at DESC LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    queryParams.push(limit, offset);

    // 3. Execute catalog query
    const productsResult = await query(sqlQuery, queryParams);

    // 4. Fetch total items count for frontend pagination metadata calculations
    let countQuery = `
      SELECT COUNT(p.id) FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const countParams: any[] = [];
    let countCounter = 1;

    if (categorySlug) {
      countQuery += ` AND c.slug = $${countCounter}`;
      countParams.push(categorySlug);
      countCounter++;
    }
    if (search) {
      countQuery += ` AND (p.title ILIKE $${countCounter} OR p.description ILIKE $${countCounter})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await query(countQuery, countParams);
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    // 5. Send optimized metadata payload response
    res.status(200).json({
      status: 'success',
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit
      },
      data: productsResult.rows
    });

  } catch (error) {
    console.error('[Get Products Catalog Error]:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error encountered while fetching catalog.' });
  }
};


export const createProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { categoryId, title, description, price, stock, imageUrl } = req.body;

    // 1. Guard against unauthenticated users
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    // 2. Fetch and verify the vendor profile from the database using req.user.id
    const vendorResult = await query(
      'SELECT id, is_approved FROM vendors WHERE user_id = $1', 
      [req.user.id]
    );

    if (vendorResult.rows.length === 0) {
      res.status(403).json({ status: 'error', message: 'Access denied. No vendor profile found.' });
      return;
    }

    const vendor = vendorResult.rows[0];

    // 3. Security Check: Block unapproved vendors from creating listings
    if (!vendor.is_approved) {
      res.status(403).json({ 
        status: 'error', 
        message: 'Your vendor account is pending approval. You cannot list products yet.' 
      });
      return;
    }

    // 4. Inputs validation
    if (!categoryId || !title || !description || price === undefined || stock === undefined) {
      res.status(400).json({ status: 'error', message: 'Missing required product information fields.' });
      return;
    }

    if (parseFloat(price) < 0 || parseInt(stock) < 0) {
      res.status(400).json({ status: 'error', message: 'Price and stock quantities cannot be negative values.' });
      return;
    }

    // 5. Secure database entry using the verified vendor.id
    const newProduct = await query(
      `INSERT INTO products (vendor_id, category_id, title, description, price, stock, image_url) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [vendor.id, categoryId, title.trim(), description.trim(), price, stock, imageUrl || null]
    );

    res.status(201).json({
      status: 'success',
      message: 'Product listed on the marketplace successfully!',
      data: newProduct.rows[0]
    });

  } catch (error) {
    console.error('[Create Product Error]:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error while uploading product.' });
  }
};
