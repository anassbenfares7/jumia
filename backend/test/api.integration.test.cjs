const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { after, before, test } = require('node:test');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error('Set TEST_DATABASE_URL to a dedicated PostgreSQL test database before running npm test.');
}

let testDatabaseName;
try {
  testDatabaseName = decodeURIComponent(new URL(testDatabaseUrl).pathname.replace(/^\/+/, ''));
} catch {
  throw new Error('TEST_DATABASE_URL must be a valid PostgreSQL connection URL.');
}

if (!testDatabaseName.toLowerCase().includes('test')) {
  throw new Error('TEST_DATABASE_URL must point to a dedicated database whose name contains "test".');
}

process.env.DATABASE_URL = testDatabaseUrl;
process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.NODE_ENV = 'test';
process.env.PORT = '5000';
process.env.CORS_ORIGINS = 'http://localhost:5173';

const app = require('../dist/app.js').default;
const pool = require('../dist/config/db.js').default;

const runId = randomUUID();
const createdUserIds = [];
const createdProductIds = [];
let buyerId;
let server;
let baseUrl;
let schemaSql;

const request = async (endpoint, { method = 'GET', token, body } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const responseText = await response.text();

  return {
    status: response.status,
    data: responseText ? JSON.parse(responseText) : null,
  };
};

before(async () => {
  schemaSql = await readFile(
    path.join(__dirname, '../src/database/init.sql'),
    'utf8',
  );
  await pool.query(schemaSql);

  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }

  try {
    if (buyerId) {
      await pool.query('DELETE FROM orders WHERE buyer_id = $1', [buyerId]);
    }
    if (createdProductIds.length > 0) {
      await pool.query('DELETE FROM products WHERE id = ANY($1::integer[])', [createdProductIds]);
    }
    if (createdUserIds.length > 0) {
      await pool.query('DELETE FROM users WHERE id = ANY($1::integer[])', [createdUserIds]);
    }
  } finally {
    await pool.end();
  }
});

test('critical marketplace API flows', async () => {
  const buyerEmail = `buyer-${runId}@example.test`;
  const buyerRegistration = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Integration Buyer', email: buyerEmail, password: 'BuyerTestPass-2026!', role: 'buyer' },
  });
  assert.equal(buyerRegistration.status, 201);
  assert.equal('password' in buyerRegistration.data.data.user, false);
  const buyer = buyerRegistration.data.data.user;
  buyerId = buyer.id;
  createdUserIds.push(buyerId);
  const buyerToken = buyerRegistration.data.data.token;

  const login = await request('/api/auth/login', {
    method: 'POST',
    body: { email: buyerEmail, password: 'BuyerTestPass-2026!' },
  });
  assert.equal(login.status, 200);
  assert.equal(login.data.data.user.id, buyerId);

  const badLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: buyerEmail, password: 'incorrect-password' },
  });
  assert.equal(badLogin.status, 401);

  const duplicateRegistration = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Duplicate Buyer', email: buyerEmail, password: 'BuyerTestPass-2026!', role: 'buyer' },
  });
  assert.equal(duplicateRegistration.status, 409);

  const vendorRegistration = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Integration Vendor',
      email: `vendor-${runId}@example.test`,
      password: 'VendorTestPass-2026!',
      role: 'vendor',
    },
  });
  assert.equal(vendorRegistration.status, 201);
  const vendor = vendorRegistration.data.data.user;
  createdUserIds.push(vendor.id);
  const vendorToken = vendorRegistration.data.data.token;

  const profile = await request('/api/vendors/register-profile', {
    method: 'POST',
    token: vendorToken,
    body: { businessName: `Integration Shop ${runId}`, phoneNumber: '0000000000' },
  });
  assert.equal(profile.status, 201);
  assert.equal(profile.data.data.is_approved, false);

  const categoriesResult = await pool.query(
    'SELECT id, slug FROM categories WHERE slug = ANY($1::text[])',
    [['electronics', 'fashion']],
  );
  const categoryIds = Object.fromEntries(
    categoriesResult.rows.map((category) => [category.slug, category.id]),
  );
  assert.ok(categoryIds.electronics);
  assert.ok(categoryIds.fashion);

  const productTitle = `Integration-${runId}`;
  const electronicsProduct = {
    categoryId: categoryIds.electronics,
    title: `${productTitle} Electronics`,
    description: 'Integration-test product.',
    price: 12.5,
    stock: 5,
  };
  const fashionProduct = {
    categoryId: categoryIds.fashion,
    title: `${productTitle} Fashion`,
    description: 'Integration-test product.',
    price: 19.99,
    stock: 1,
  };

  const pendingProduct = await request('/api/products', {
    method: 'POST',
    token: vendorToken,
    body: electronicsProduct,
  });
  assert.equal(pendingProduct.status, 403);

  const forbiddenApproval = await request(`/api/admin/approve-vendor/${profile.data.data.id}`, {
    method: 'PUT',
    token: buyerToken,
  });
  assert.equal(forbiddenApproval.status, 403);

  const adminEmail = `admin-${runId}@example.test`;
  const adminPasswordHash = await bcrypt.hash('IntegrationAdminPass-2026!', 10);
  const adminResult = await pool.query(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, 'admin')
     RETURNING id, email, role`,
    ['Integration Admin', adminEmail, adminPasswordHash],
  );
  const admin = adminResult.rows[0];
  createdUserIds.push(admin.id);
  const adminToken = jwt.sign(
    { id: admin.id, email: admin.email, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' },
  );

  const approval = await request(`/api/admin/approve-vendor/${profile.data.data.id}`, {
    method: 'PUT',
    token: adminToken,
  });
  assert.equal(approval.status, 200);
  assert.equal(approval.data.data.is_approved, true);

  for (const product of [electronicsProduct, fashionProduct]) {
    const creation = await request('/api/products', {
      method: 'POST',
      token: vendorToken,
      body: product,
    });
    assert.equal(creation.status, 201);
    createdProductIds.push(creation.data.data.id);
  }

  const catalogPageOne = await request(
    `/api/products?page=1&limit=1&search=${encodeURIComponent(productTitle)}`,
  );
  assert.equal(catalogPageOne.status, 200);
  assert.equal(catalogPageOne.data.pagination.totalItems, 2);
  assert.equal(catalogPageOne.data.pagination.totalPages, 2);
  assert.equal(catalogPageOne.data.data.length, 1);

  const catalogPageTwo = await request(
    `/api/products?page=2&limit=1&search=${encodeURIComponent(productTitle)}`,
  );
  assert.equal(catalogPageTwo.status, 200);
  assert.equal(catalogPageTwo.data.data.length, 1);

  const electronicsCatalog = await request(
    `/api/products?category=electronics&search=${encodeURIComponent(productTitle)}`,
  );
  assert.equal(electronicsCatalog.status, 200);
  assert.equal(electronicsCatalog.data.pagination.totalItems, 1);
  assert.equal(electronicsCatalog.data.data[0].category_name, 'Electronics');

  const electronicsId = createdProductIds[0];
  const fashionId = createdProductIds[1];
  const unauthorizedCheckout = await request('/api/orders/checkout', {
    method: 'POST',
    body: { items: [{ productId: electronicsId, quantity: 1 }] },
  });
  assert.equal(unauthorizedCheckout.status, 401);

  const vendorCheckout = await request('/api/orders/checkout', {
    method: 'POST',
    token: vendorToken,
    body: { items: [{ productId: electronicsId, quantity: 1 }] },
  });
  assert.equal(vendorCheckout.status, 403);

  const emptyCheckout = await request('/api/orders/checkout', {
    method: 'POST',
    token: buyerToken,
    body: { items: [] },
  });
  assert.equal(emptyCheckout.status, 400);

  const checkout = await request('/api/orders/checkout', {
    method: 'POST',
    token: buyerToken,
    body: { items: [{ productId: electronicsId, quantity: 2 }] },
  });
  assert.equal(checkout.status, 201);
  assert.equal(checkout.data.data.paymentMode, 'demo');
  assert.equal(checkout.data.data.paymentStatus, 'pending');
  assert.match(checkout.data.message, /No payment was collected/);

  const savedOrder = await pool.query(
    'SELECT payment_status, stripe_intent_id FROM orders WHERE id = $1',
    [checkout.data.data.orderId],
  );
  assert.equal(savedOrder.rows[0].payment_status, 'pending');
  assert.equal(savedOrder.rows[0].stripe_intent_id, null);

  const oversell = await request('/api/orders/checkout', {
    method: 'POST',
    token: buyerToken,
    body: { items: [{ productId: electronicsId, quantity: 99 }] },
  });
  assert.equal(oversell.status, 400);

  const inventory = await pool.query('SELECT stock FROM products WHERE id = $1', [electronicsId]);
  assert.equal(inventory.rows[0].stock, 3);

  const vendorHistory = await request('/api/orders/history', { token: vendorToken });
  assert.equal(vendorHistory.status, 403);

  const buyerHistory = await request('/api/orders/history', { token: buyerToken });
  assert.equal(buyerHistory.status, 200);
  assert.equal(buyerHistory.data.data.length, 1);
  assert.equal(buyerHistory.data.data[0].product_title, electronicsProduct.title);
  assert.equal(buyerHistory.data.data[0].payment_status, 'pending');

  const unauthorizedReview = await request('/api/reviews', {
    method: 'POST',
    body: { productId: electronicsId, rating: 5, comment: 'Good product.' },
  });
  assert.equal(unauthorizedReview.status, 401);

  const vendorReview = await request('/api/reviews', {
    method: 'POST',
    token: vendorToken,
    body: { productId: electronicsId, rating: 5, comment: 'Good product.' },
  });
  assert.equal(vendorReview.status, 403);

  const unpurchasedReview = await request('/api/reviews', {
    method: 'POST',
    token: buyerToken,
    body: { productId: fashionId, rating: 5, comment: 'Not purchased.' },
  });
  assert.equal(unpurchasedReview.status, 403);

  const invalidReview = await request('/api/reviews', {
    method: 'POST',
    token: buyerToken,
    body: { productId: electronicsId, rating: 6, comment: 'Invalid rating.' },
  });
  assert.equal(invalidReview.status, 400);

  const review = await request('/api/reviews', {
    method: 'POST',
    token: buyerToken,
    body: { productId: electronicsId, rating: 5, comment: 'Verified purchase.' },
  });
  assert.equal(review.status, 201);

  const duplicateReview = await request('/api/reviews', {
    method: 'POST',
    token: buyerToken,
    body: { productId: electronicsId, rating: 5, comment: 'Duplicate review.' },
  });
  assert.equal(duplicateReview.status, 409);

  const publicReviews = await request(`/api/reviews/product/${electronicsId}`);
  assert.equal(publicReviews.status, 200);
  assert.equal(publicReviews.data.data.length, 1);
  assert.equal(publicReviews.data.data[0].reviewer_name, 'Integration Buyer');

  const legacyOrder = await pool.query(
    `INSERT INTO orders (buyer_id, total_amount, payment_status, stripe_intent_id)
     VALUES ($1, 25, 'completed', 'mock_sandbox_stripe_intent_id')
     RETURNING id`,
    [buyerId],
  );
  await pool.query(schemaSql);
  const correctedLegacyOrder = await pool.query(
    'SELECT payment_status, stripe_intent_id FROM orders WHERE id = $1',
    [legacyOrder.rows[0].id],
  );
  assert.equal(correctedLegacyOrder.rows[0].payment_status, 'pending');
  assert.equal(correctedLegacyOrder.rows[0].stripe_intent_id, null);
});
