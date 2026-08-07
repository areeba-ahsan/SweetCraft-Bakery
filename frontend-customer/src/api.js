// ============================================================
// SweetCraft Bakery — Frontend API helper
// Wraps fetch() calls to the backend, attaches the JWT token
// automatically, and centralizes the base URL.
// ============================================================

// Reads the deployed backend URL from Vercel's REACT_APP_API_BASE_URL
// environment variable. Falls back to localhost only for local development.
const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('sweetcraft_token');
}

export function saveSession(token, user) {
  localStorage.setItem('sweetcraft_token', token);
  localStorage.setItem('sweetcraft_user', JSON.stringify(user));
}

export function loadSession() {
  const token = localStorage.getItem('sweetcraft_token');
  const userRaw = localStorage.getItem('sweetcraft_user');
  if (!token || !userRaw) return null;
  try {
    return { token, user: JSON.parse(userRaw) };
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem('sweetcraft_token');
  localStorage.removeItem('sweetcraft_user');
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data.message || data.error || 'Something went wrong. Please try again.');
  }
  return data;
}

export const api = {
  // ---- Auth ----
  register: (payload) => request('POST', '/auth/register', payload),
  login: (payload) => request('POST', '/auth/login', payload),

  // ---- Products ----
  getProducts: (category) => request('GET', category ? `/products?category=${category}` : '/products'),
  addProduct: (payload) => request('POST', '/products', payload),
  updateProduct: (id, payload) => request('PUT', `/products/${id}`, payload),
  deleteProduct: (id) => request('DELETE', `/products/${id}`),

  // ---- Cart ----
  getCart: () => request('GET', '/cart'),
  addToCart: (productId, quantity = 1) => request('POST', '/cart', { productId, quantity }),
  updateCartItem: (productId, quantity) => request('PUT', `/cart/${productId}`, { quantity }),
  removeFromCart: (productId) => request('DELETE', `/cart/${productId}`),

  // ---- Checkout & Orders ----
  checkout: (payload) => request('POST', '/checkout', payload),
  getMyOrders: () => request('GET', '/orders/mine'),
  getAllOrders: () => request('GET', '/orders'),
  updateOrderStatus: (id, status) => request('PUT', `/orders/${id}/status`, { status }),

  // ---- Reviews ----
  getReviews: () => request('GET', '/reviews'),
  addReview: (payload) => request('POST', '/reviews', payload),
  deleteReview: (id) => request('DELETE', `/reviews/${id}`)
};