import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { initializePool, closePool, executeQuery } from './db.js';
import { verifyToken, requireAdmin } from './middleware/auth.js';

dotenv.config();

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ==================================================================
// 🩺 HEALTH CHECK
// ==================================================================
app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

// ==================================================================
// 🔐 AUTH — Register
// ==================================================================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password, phone, address } = req.body;
    const safeName = (fullName || '').trim();
    const safeEmail = (email || '').trim().toLowerCase();
    const safePass = (password || '').trim();
    const safePhone = (phone || '').trim();
    const safeAddress = (address || '').trim();

    if (!safeName || !safeEmail || !safePass) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    }
    if (safePass.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const existing = await executeQuery('SELECT id FROM users WHERE LOWER(email) = $1', [safeEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(safePass, 10);

    const inserted = await executeQuery(
      `INSERT INTO users (full_name, email, password, phone, address, role)
       VALUES ($1, $2, $3, $4, $5, 'CUSTOMER') RETURNING id`,
      [safeName, safeEmail, hashedPassword, safePhone, safeAddress]
    );
    const newId = inserted[0].id;

    const token = jwt.sign(
      { id: newId, name: safeName, email: safeEmail, role: 'CUSTOMER' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: { id: newId, name: safeName, email: safeEmail, phone: safePhone, address: safeAddress, role: 'CUSTOMER' }
    });
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

// ==================================================================
// 🔐 AUTH — Login
// ==================================================================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const safeEmail = (email || '').trim().toLowerCase();
    const safePass = (password || '').trim();

    const users = await executeQuery(
      `SELECT id, full_name AS "name", email, password, phone, address, role FROM users WHERE LOWER(email) = $1`,
      [safeEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const u = users[0];
    const isMatch = await bcrypt.compare(safePass, u.password || '');
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const role = (u.role || 'CUSTOMER').toUpperCase();
    const token = jwt.sign(
      { id: u.id, name: u.name, email: u.email, role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: u.id, name: u.name, email: u.email, phone: u.phone, address: u.address, role }
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

// ==================================================================
// 🎂 PRODUCTS — public read, admin write
// ==================================================================
app.get('/api/products', async (req, res) => {
  try {
    const { category } = req.query;
    let sql = `SELECT id, category, name, price, tag, image_url AS "img" FROM products`;
    const params = [];
    if (category) {
      sql += ' WHERE category = $1';
      params.push(category);
    }
    sql += ' ORDER BY id ASC';

    const products = await executeQuery(sql, params);
    res.json(products);
  } catch (err) {
    console.error('Get Products Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { category, name, price, tag, img } = req.body;
    if (!category || !name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Category, name and price are required.' });
    }

    const inserted = await executeQuery(
      `INSERT INTO products (category, name, price, tag, image_url) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [category, name, Number(price), tag || 'New', img || '']
    );

    res.json({ success: true, message: 'Product added!', id: inserted[0].id });
  } catch (err) {
    console.error('Add Product Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/products/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { category, name, price, tag, img } = req.body;

    await executeQuery(
      `UPDATE products SET category=$1, name=$2, price=$3, tag=$4, image_url=$5 WHERE id=$6`,
      [category, name, Number(price), tag, img, Number(id)]
    );

    res.json({ success: true, message: 'Product updated!' });
  } catch (err) {
    console.error('Update Product Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/products/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    await executeQuery('DELETE FROM products WHERE id=$1', [Number(req.params.id)]);
    res.json({ success: true, message: 'Product deleted.' });
  } catch (err) {
    console.error('Delete Product Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================================================================
// 🛒 CART
// ==================================================================
app.get('/api/cart', verifyToken, async (req, res) => {
  try {
    const sql = `
      SELECT ci.id AS "cartId", ci.quantity, p.id AS "productId", p.name, p.price, p.category, p.tag, p.image_url AS "img"
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.user_id = $1
      ORDER BY ci.added_at DESC
    `;
    const items = await executeQuery(sql, [req.user.id]);
    res.json(items);
  } catch (err) {
    console.error('Get Cart Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cart', verifyToken, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const qty = Math.max(1, Number(quantity) || 1);

    // ON CONFLICT upsert: if this user already has this product in
    // their cart, bump the quantity instead of erroring on the
    // (user_id, product_id) unique constraint.
    await executeQuery(
      `INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1,$2,$3)
       ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`,
      [req.user.id, Number(productId), qty]
    );

    res.json({ success: true, message: 'Added to cart!' });
  } catch (err) {
    console.error('Add To Cart Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/cart/:productId', verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const qty = Number(req.body.quantity);

    if (qty <= 0) {
      await executeQuery('DELETE FROM cart_items WHERE user_id=$1 AND product_id=$2', [req.user.id, Number(productId)]);
      return res.json({ success: true, message: 'Item removed.' });
    }

    await executeQuery(
      'UPDATE cart_items SET quantity=$1 WHERE user_id=$2 AND product_id=$3',
      [qty, req.user.id, Number(productId)]
    );
    res.json({ success: true, message: 'Cart updated.' });
  } catch (err) {
    console.error('Update Cart Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/cart/:productId', verifyToken, async (req, res) => {
  try {
    await executeQuery('DELETE FROM cart_items WHERE user_id=$1 AND product_id=$2', [req.user.id, Number(req.params.productId)]);
    res.json({ success: true, message: 'Item removed from cart.' });
  } catch (err) {
    console.error('Remove From Cart Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================================================================
// 🧾 CHECKOUT
// ==================================================================
app.post('/api/checkout', verifyToken, async (req, res) => {
  try {
    const { phone, address } = req.body;

    const cartRows = await executeQuery(
      `SELECT ci.quantity, p.id AS "productId", p.name, p.price, p.category
       FROM cart_items ci JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = $1`,
      [req.user.id]
    );

    if (cartRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Your cart is empty.' });
    }

    const totalPrice = cartRows.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);

    const orderResult = await executeQuery(
      `INSERT INTO orders (user_id, customer_name, customer_phone, customer_address, total_price, status)
       VALUES ($1,$2,$3,$4,$5,'Pending') RETURNING id`,
      [req.user.id, req.user.name, (phone || '').trim(), (address || '').trim(), totalPrice]
    );
    const orderId = orderResult[0].id;

    for (const item of cartRows) {
      await executeQuery(
        `INSERT INTO order_items (order_id, product_id, product_name, category, quantity, unit_price)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [orderId, item.productId, item.name, item.category, item.quantity, item.price]
      );
    }

    await executeQuery('DELETE FROM cart_items WHERE user_id=$1', [req.user.id]);

    res.json({ success: true, message: 'Order placed successfully!', orderId, totalPrice });
  } catch (err) {
    console.error('Checkout Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================================================================
// 📋 ORDERS
// ==================================================================
app.get('/api/orders/mine', verifyToken, async (req, res) => {
  try {
    const orders = await executeQuery(
      `SELECT id, total_price AS "totalPrice", status, order_date AS "date" FROM orders WHERE user_id=$1 ORDER BY id DESC`,
      [req.user.id]
    );

    for (const o of orders) {
      o.items = await executeQuery(
        `SELECT product_name AS "name", category, quantity, unit_price AS "price" FROM order_items WHERE order_id=$1`,
        [o.id]
      );
    }

    res.json(orders);
  } catch (err) {
    console.error('Get My Orders Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', verifyToken, requireAdmin, async (req, res) => {
  try {
    const orders = await executeQuery(
      `SELECT id, user_id AS "userId", customer_name AS "customerName", customer_phone AS "customerPhone",
              customer_address AS "customerAddress", total_price AS "totalPrice", status, order_date AS "date"
       FROM orders ORDER BY id DESC`
    );

    for (const o of orders) {
      o.items = await executeQuery(
        `SELECT product_name AS "name", category, quantity, unit_price AS "price" FROM order_items WHERE order_id=$1`,
        [o.id]
      );
    }

    res.json(orders);
  } catch (err) {
    console.error('Get All Orders Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:id/status', verifyToken, requireAdmin, async (req, res) => {
  try {
    const safeStatus = (req.body.status || 'Pending').trim();
    await executeQuery('UPDATE orders SET status=$1 WHERE id=$2', [safeStatus, Number(req.params.id)]);
    res.json({ success: true, message: 'Order status updated!' });
  } catch (err) {
    console.error('Update Order Status Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================================================================
// ⭐ REVIEWS
// ==================================================================
app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await executeQuery(
      `SELECT id, name, rating, comment_text AS "comment", created_at AS "date" FROM reviews ORDER BY id DESC`
    );
    res.json(reviews);
  } catch (err) {
    console.error('Get Reviews Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reviews', verifyToken, async (req, res) => {
  try {
    const safeRating = Math.min(5, Math.max(1, Number(req.body.rating) || 5));
    const safeComment = (req.body.comment || '').trim();

    if (!safeComment) {
      return res.status(400).json({ success: false, message: 'Please write a comment.' });
    }

    await executeQuery(
      `INSERT INTO reviews (user_id, name, rating, comment_text) VALUES ($1,$2,$3,$4)`,
      [req.user.id, req.user.name, safeRating, safeComment]
    );

    res.json({ success: true, message: 'Thanks for your review!' });
  } catch (err) {
    console.error('Add Review Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/reviews/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    await executeQuery('DELETE FROM reviews WHERE id=$1', [Number(req.params.id)]);
    res.json({ success: true, message: 'Review removed.' });
  } catch (err) {
    console.error('Delete Review Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================================================================
// 🚀 START SERVER
// ==================================================================
const PORT = process.env.PORT || 5000;

initializePool()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`🚀 Backend live on http://localhost:${PORT}`);
    });

    const shutdown = async () => {
      console.log('\nShutting down server gracefully...');
      server.close(async () => {
        await closePool();
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  })
  .catch((err) => {
    console.error('Failed to start server due to DB error:', err);
  });