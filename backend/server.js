import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import oracledb from 'oracledb';
import { initializePool, closePool, executeQuery } from './db.js';
import { verifyToken, requireAdmin } from './middleware/auth.js';

dotenv.config();

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ------------------------------------------------------------------
// Small helper: run an INSERT that uses "RETURNING id INTO :newId"
// so we get the auto-generated identity value straight back,
// instead of relying on a follow-up SELECT (avoids race conditions).
// ------------------------------------------------------------------
async function insertAndGetId(sql, binds) {
  const connection = await oracledb.getConnection();
  try {
    const fullBinds = { ...binds, newId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } };
    const result = await connection.execute(sql, fullBinds, { autoCommit: true });
    return result.outBinds.newId[0];
  } finally {
    await connection.close();
  }
}

// Normalizes Oracle's UPPERCASE column keys (ID, FULL_NAME...) to a plain object.
function row(r, map) {
  const out = {};
  for (const [key, col] of Object.entries(map)) {
    out[key] = r[col] ?? r[col.toLowerCase()];
  }
  return out;
}

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

    const existing = await executeQuery('SELECT id FROM users WHERE LOWER(email) = :email', { email: safeEmail });
    if (existing && existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(safePass, 10);

    const newId = await insertAndGetId(
      `INSERT INTO users (full_name, email, password, phone, address, role)
       VALUES (:fullName, :email, :password, :phone, :address, 'CUSTOMER')
       RETURNING id INTO :newId`,
      { fullName: safeName, email: safeEmail, password: hashedPassword, phone: safePhone, address: safeAddress }
    );

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
// 🔐 AUTH — Login (customer & admin, role comes from DB)
// ==================================================================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const safeEmail = (email || '').trim().toLowerCase();
    const safePass = (password || '').trim();

    const sql = `SELECT id, full_name, email, password, phone, address, role FROM users WHERE LOWER(email) = :email`;
    const users = await executeQuery(sql, { email: safeEmail });

    if (!users || users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const u = row(users[0], {
      id: 'ID', name: 'FULL_NAME', email: 'EMAIL', password: 'PASSWORD',
      phone: 'PHONE', address: 'ADDRESS', role: 'ROLE'
    });

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
    let sql = 'SELECT id, category, name, price, tag, image_url FROM products';
    const binds = {};
    if (category) {
      sql += ' WHERE category = :category';
      binds.category = category;
    }
    sql += ' ORDER BY id ASC';

    const products = await executeQuery(sql, binds);
    const mapped = products.map(p => row(p, {
      id: 'ID', category: 'CATEGORY', name: 'NAME', price: 'PRICE', tag: 'TAG', img: 'IMAGE_URL'
    }));
    res.json(mapped);
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

    const newId = await insertAndGetId(
      `INSERT INTO products (category, name, price, tag, image_url)
       VALUES (:category, :name, :price, :tag, :img)
       RETURNING id INTO :newId`,
      { category, name, price: Number(price), tag: tag || 'New', img: img || '' }
    );

    res.json({ success: true, message: 'Product added!', id: newId });
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
      `UPDATE products SET category = :category, name = :name, price = :price, tag = :tag, image_url = :img WHERE id = :id`,
      { category, name, price: Number(price), tag, img, id: Number(id) }
    );

    res.json({ success: true, message: 'Product updated!' });
  } catch (err) {
    console.error('Update Product Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/products/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await executeQuery('DELETE FROM products WHERE id = :id', { id: Number(id) });
    res.json({ success: true, message: 'Product deleted.' });
  } catch (err) {
    console.error('Delete Product Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================================================================
// 🛒 CART — requires login. One row per (user, product); quantity updates in place.
// ==================================================================
app.get('/api/cart', verifyToken, async (req, res) => {
  try {
    const sql = `
      SELECT ci.id AS cart_id, ci.quantity, p.id AS product_id, p.name, p.price, p.category, p.tag, p.image_url
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.user_id = :userId
      ORDER BY ci.added_at DESC
    `;
    const items = await executeQuery(sql, { userId: req.user.id });
    const mapped = items.map(i => row(i, {
      cartId: 'CART_ID', quantity: 'QUANTITY', productId: 'PRODUCT_ID', name: 'NAME',
      price: 'PRICE', category: 'CATEGORY', tag: 'TAG', img: 'IMAGE_URL'
    }));
    res.json(mapped);
  } catch (err) {
    console.error('Get Cart Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cart', verifyToken, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const qty = Math.max(1, Number(quantity) || 1);

    const existing = await executeQuery(
      'SELECT id, quantity FROM cart_items WHERE user_id = :userId AND product_id = :productId',
      { userId: req.user.id, productId: Number(productId) }
    );

    if (existing && existing.length > 0) {
      const current = row(existing[0], { id: 'ID', quantity: 'QUANTITY' });
      await executeQuery(
        'UPDATE cart_items SET quantity = :qty WHERE id = :id',
        { qty: current.quantity + qty, id: current.id }
      );
    } else {
      await insertAndGetId(
        `INSERT INTO cart_items (user_id, product_id, quantity) VALUES (:userId, :productId, :qty) RETURNING id INTO :newId`,
        { userId: req.user.id, productId: Number(productId), qty }
      );
    }

    res.json({ success: true, message: 'Added to cart!' });
  } catch (err) {
    console.error('Add To Cart Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/cart/:productId', verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    const qty = Number(quantity);

    if (qty <= 0) {
      await executeQuery('DELETE FROM cart_items WHERE user_id = :userId AND product_id = :productId',
        { userId: req.user.id, productId: Number(productId) });
      return res.json({ success: true, message: 'Item removed.' });
    }

    await executeQuery(
      'UPDATE cart_items SET quantity = :qty WHERE user_id = :userId AND product_id = :productId',
      { qty, userId: req.user.id, productId: Number(productId) }
    );
    res.json({ success: true, message: 'Cart updated.' });
  } catch (err) {
    console.error('Update Cart Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/cart/:productId', verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    await executeQuery('DELETE FROM cart_items WHERE user_id = :userId AND product_id = :productId',
      { userId: req.user.id, productId: Number(productId) });
    res.json({ success: true, message: 'Item removed from cart.' });
  } catch (err) {
    console.error('Remove From Cart Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================================================================
// 🧾 CHECKOUT — converts the logged-in user's cart into an order
// ==================================================================
app.post('/api/checkout', verifyToken, async (req, res) => {
  try {
    const { phone, address } = req.body;

    const cartSql = `
      SELECT ci.quantity, p.id AS product_id, p.name, p.price, p.category
      FROM cart_items ci JOIN products p ON p.id = ci.product_id
      WHERE ci.user_id = :userId
    `;
    const cartRows = await executeQuery(cartSql, { userId: req.user.id });

    if (!cartRows || cartRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Your cart is empty.' });
    }

    const items = cartRows.map(i => row(i, {
      quantity: 'QUANTITY', productId: 'PRODUCT_ID', name: 'NAME', price: 'PRICE', category: 'CATEGORY'
    }));
    const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const orderId = await insertAndGetId(
      `INSERT INTO orders (user_id, customer_name, customer_phone, customer_address, total_price, status)
       VALUES (:userId, :customerName, :phone, :address, :total, 'Pending')
       RETURNING id INTO :newId`,
      {
        userId: req.user.id,
        customerName: req.user.name,
        phone: (phone || '').trim(),
        address: (address || '').trim(),
        total: totalPrice
      }
    );

    for (const item of items) {
      await executeQuery(
        `INSERT INTO order_items (order_id, product_id, product_name, category, quantity, unit_price)
         VALUES (:orderId, :productId, :name, :category, :qty, :price)`,
        { orderId, productId: item.productId, name: item.name, category: item.category, qty: item.quantity, price: item.price }
      );
    }

    await executeQuery('DELETE FROM cart_items WHERE user_id = :userId', { userId: req.user.id });

    res.json({ success: true, message: 'Order placed successfully!', orderId, totalPrice });
  } catch (err) {
    console.error('Checkout Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================================================================
// 📋 ORDERS
// ==================================================================

// Logged-in customer's own order history
app.get('/api/orders/mine', verifyToken, async (req, res) => {
  try {
    const orders = await executeQuery(
      'SELECT id, total_price, status, order_date FROM orders WHERE user_id = :userId ORDER BY id DESC',
      { userId: req.user.id }
    );
    const mappedOrders = orders.map(o => row(o, { id: 'ID', totalPrice: 'TOTAL_PRICE', status: 'STATUS', date: 'ORDER_DATE' }));

    for (const o of mappedOrders) {
      const items = await executeQuery(
        'SELECT product_name, category, quantity, unit_price FROM order_items WHERE order_id = :id',
        { id: o.id }
      );
      o.items = items.map(i => row(i, { name: 'PRODUCT_NAME', category: 'CATEGORY', quantity: 'QUANTITY', price: 'UNIT_PRICE' }));
    }

    res.json(mappedOrders);
  } catch (err) {
    console.error('Get My Orders Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// All orders — admin only
app.get('/api/orders', verifyToken, requireAdmin, async (req, res) => {
  try {
    const orders = await executeQuery('SELECT * FROM orders ORDER BY id DESC');
    const mappedOrders = orders.map(o => row(o, {
      id: 'ID', userId: 'USER_ID', customerName: 'CUSTOMER_NAME', customerPhone: 'CUSTOMER_PHONE',
      customerAddress: 'CUSTOMER_ADDRESS', totalPrice: 'TOTAL_PRICE', status: 'STATUS', date: 'ORDER_DATE'
    }));

    for (const o of mappedOrders) {
      const items = await executeQuery(
        'SELECT product_name, category, quantity, unit_price FROM order_items WHERE order_id = :id',
        { id: o.id }
      );
      o.items = items.map(i => row(i, { name: 'PRODUCT_NAME', category: 'CATEGORY', quantity: 'QUANTITY', price: 'UNIT_PRICE' }));
    }

    res.json(mappedOrders);
  } catch (err) {
    console.error('Get All Orders Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update order status — admin only
app.put('/api/orders/:id/status', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const safeStatus = (status || 'Pending').trim();

    await executeQuery('UPDATE orders SET status = :status WHERE id = :id', { status: safeStatus, id: Number(id) });
    res.json({ success: true, message: 'Order status updated!' });
  } catch (err) {
    console.error('Update Order Status Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================================================================
// ⭐ REVIEWS — public read, logged-in customers write, admin delete
// ==================================================================
app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await executeQuery('SELECT id, name, rating, review_text, created_at FROM reviews ORDER BY id DESC');
    const mapped = reviews.map(r => row(r, {
      id: 'ID', name: 'NAME', rating: 'RATING', comment: 'REVIEW_TEXT', date: 'CREATED_AT'
    }));
    res.json(mapped);
  } catch (err) {
    console.error('Get Reviews Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reviews', verifyToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const safeRating = Math.min(5, Math.max(1, Number(rating) || 5));
    const safeComment = (comment || '').trim();

    if (!safeComment) {
      return res.status(400).json({ success: false, message: 'Please write a comment.' });
    }

    await insertAndGetId(
      `INSERT INTO reviews (user_id, name, rating, review_text) VALUES (:userId, :name, :rating, :comment) RETURNING id INTO :newId`,
      { userId: req.user.id, name: req.user.name, rating: safeRating, comment: safeComment }
    );

    res.json({ success: true, message: 'Thanks for your review!' });
  } catch (err) {
    console.error('Add Review Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/reviews/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await executeQuery('DELETE FROM reviews WHERE id = :id', { id: Number(id) });
    res.json({ success: true, message: 'Review removed.' });
  } catch (err) {
    console.error('Delete Review Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================================================================
// 🚀 START SERVER (Oracle DB pool)
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
    console.error('Failed to start server due to Oracle DB error:', err);
  });