import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api';

const CATEGORY_META = {
  cakes: { title: 'Cakes' },
  wedding: { title: 'Wedding Cakes' },
  brownies: { title: 'Fudgy Brownies' },
  donuts: { title: 'Donuts' },
  cupcakes: { title: 'Cupcakes' }
};

const STATUS_OPTIONS = ['Pending', 'Baking', 'Ready for Pickup', 'Delivered', 'Cancelled'];

const getStatusBadgeStyle = (status) => {
  switch (status) {
    case 'Pending': return { backgroundColor: '#fff3cd', color: '#856404', label: 'Pending' };
    case 'Baking': return { backgroundColor: '#FFE4E8', color: '#D87093', label: 'Baking 🧁' };
    case 'Ready for Pickup': return { backgroundColor: '#e1f5fe', color: '#0288d1', label: 'Ready 📦' };
    case 'Delivered': return { backgroundColor: '#E2F0CB', color: '#4A6B22', label: 'Delivered ✨' };
    case 'Cancelled': return { backgroundColor: '#f8d7da', color: '#721c24', label: 'Cancelled' };
    default: return { backgroundColor: '#f0f0f0', color: '#666', label: status };
  }
};

const emptyForm = { name: '', price: '', tag: '', img: '', category: 'cakes' };

export default function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [menuCategory, setMenuCategory] = useState('cakes');
  const [orderFilter, setOrderFilter] = useState('All');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'product'|'review', id }

  // ---------------- Load everything ----------------
  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [productsData, ordersData, reviewsData] = await Promise.all([
        api.getProducts(),
        api.getAllOrders(),
        api.getReviews()
      ]);
      setProducts(productsData);
      setOrders(ordersData);
      setReviews(reviewsData);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ---------------- Derived metrics ----------------
  const totalRevenue = orders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);
  const totalCustomers = new Set(orders.map(o => o.customerName)).size;
  const activeOrders = orders.filter(o => ['Pending', 'Baking', 'Ready for Pickup'].includes(o.status)).length;
  const completedOrders = orders.filter(o => o.status === 'Delivered').length;
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length).toFixed(1) : '0.0';
  const statusCounts = STATUS_OPTIONS.reduce((acc, s) => { acc[s] = orders.filter(o => o.status === s).length; return acc; }, {});

  // ---------------- Orders ----------------
  const handleStatusChange = async (orderId, newStatus) => {
    setOrders(orders.map(o => (o.id === orderId ? { ...o, status: newStatus } : o))); // optimistic
    try {
      await api.updateOrderStatus(orderId, newStatus);
    } catch (err) {
      setErrorMsg(err.message);
      loadAll();
    }
  };

  const filteredOrders = orderFilter === 'All' ? orders : orders.filter(o => o.status === orderFilter);

  // ---------------- Products ----------------
  const openAddModal = () => { setEditingId(null); setForm({ ...emptyForm, category: menuCategory }); setIsModalOpen(true); };
  const openEditModal = (p) => {
    setEditingId(p.id);
    setForm({ name: p.name, price: String(p.price), tag: p.tag || '', img: p.img || '', category: p.category });
    setIsModalOpen(true);
  };
  const closeModal = () => { setIsModalOpen(false); setEditingId(null); setForm(emptyForm); };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) return;
    const payload = { category: form.category, name: form.name.trim(), price: parseFloat(form.price), tag: form.tag.trim() || 'New', img: form.img.trim() };
    try {
      if (editingId !== null) {
        await api.updateProduct(editingId, payload);
      } else {
        await api.addProduct(payload);
        setMenuCategory(form.category);
      }
      closeModal();
      loadAll();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const requestDeleteProduct = (id) => setConfirmDelete({ type: 'product', id });
  const requestDeleteReview = (id) => setConfirmDelete({ type: 'review', id });

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === 'product') await api.deleteProduct(confirmDelete.id);
      else await api.deleteReview(confirmDelete.id);
      loadAll();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setConfirmDelete(null);
    }
  };

  const categoryProducts = products.filter(p => p.category === menuCategory);

  const cardStyle = { backgroundColor: '#FFF', borderRadius: '20px', padding: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #FFE4E8' };
  const pillBtn = (active) => ({ padding: '10px 20px', borderRadius: '20px', border: 'none', backgroundColor: active ? '#D87093' : '#E8DFF5', color: active ? '#FFF' : '#555', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' });

  if (loading) {
    return <div style={{ backgroundColor: '#FAF4F6', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Poppins', sans-serif", color: '#8B5E83' }}>Loading admin dashboard…</div>;
  }

  return (
    <div style={{ backgroundColor: '#FAF4F6', minHeight: '100vh', fontFamily: "'Poppins', sans-serif", color: '#4A4A4A' }}>

      {/* NAVBAR */}
      <nav style={{ backgroundColor: '#FFF0F5', padding: '18px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', borderBottom: '2px solid #FFE4E8', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ margin: 0, color: '#D87093', fontSize: '26px', fontFamily: "'Georgia', serif", letterSpacing: '1px' }}>
          🎂 SweetCraft Admin
        </h1>
        <div style={{ display: 'flex', gap: '25px', alignItems: 'center', flexWrap: 'wrap' }}>
          {['overview', 'orders', 'menu', 'reviews'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: 'none', border: 'none', fontSize: '15px',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              color: activeTab === tab ? '#D87093' : '#666',
              borderBottom: activeTab === tab ? '2px solid #D87093' : '2px solid transparent',
              paddingBottom: '4px', cursor: 'pointer', textTransform: 'capitalize'
            }}>
              {tab === 'overview' ? 'Overview' : tab === 'orders' ? 'Orders' : tab === 'menu' ? 'Menu Management' : 'Reviews'}
            </button>
          ))}
          <button onClick={onLogout} style={{ background: 'none', border: '1px solid #D87093', color: '#D87093', padding: '6px 14px', borderRadius: '15px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '30px auto', padding: '0 20px 60px 20px' }}>

        {errorMsg && (
          <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px' }}>
            {errorMsg}
          </div>
        )}

        {/* ---------------- OVERVIEW ---------------- */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '18px', marginBottom: '25px' }}>
              <div style={{ backgroundColor: '#FFF0F5', padding: '1.5rem', borderRadius: '16px', border: '1px solid #FFE4E8' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#D87093' }}>TOTAL REVENUE</span>
                <h2 style={{ fontSize: '1.7rem', margin: '8px 0 0 0', color: '#8B5E83' }}>${totalRevenue.toFixed(2)}</h2>
              </div>
              <div style={{ backgroundColor: '#E8DFF5', padding: '1.5rem', borderRadius: '16px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6b4f8f' }}>TOTAL CUSTOMERS</span>
                <h2 style={{ fontSize: '1.7rem', margin: '8px 0 0 0', color: '#3d2c56' }}>{totalCustomers}</h2>
              </div>
              <div style={{ backgroundColor: '#FFE4E8', padding: '1.5rem', borderRadius: '16px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a33b57' }}>ACTIVE ORDERS</span>
                <h2 style={{ fontSize: '1.7rem', margin: '8px 0 0 0', color: '#591627' }}>{activeOrders}</h2>
              </div>
              <div style={{ backgroundColor: '#E2F0CB', padding: '1.5rem', borderRadius: '16px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4A6B22' }}>DELIVERED</span>
                <h2 style={{ fontSize: '1.7rem', margin: '8px 0 0 0', color: '#2b3f14' }}>{completedOrders}</h2>
              </div>
              <div style={{ backgroundColor: '#e1f5fe', padding: '1.5rem', borderRadius: '16px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0288d1' }}>MENU ITEMS</span>
                <h2 style={{ fontSize: '1.7rem', margin: '8px 0 0 0', color: '#01579b' }}>{products.length}</h2>
              </div>
              <div style={{ backgroundColor: '#fff3cd', padding: '1.5rem', borderRadius: '16px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#856404' }}>AVG. REVIEW RATING</span>
                <h2 style={{ fontSize: '1.7rem', margin: '8px 0 0 0', color: '#5c4404' }}>{avgRating} ★ <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>({reviews.length})</span></h2>
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 16px 0', color: '#8B5E83' }}>Orders by Status</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
                {STATUS_OPTIONS.map((s) => {
                  const badge = getStatusBadgeStyle(s);
                  return (
                    <div key={s} style={{ backgroundColor: badge.backgroundColor, borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, color: badge.color, fontSize: '1.3rem' }}>{statusCounts[s]}</div>
                      <div style={{ fontSize: '0.75rem', color: badge.color, fontWeight: 600, marginTop: '4px' }}>{badge.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- ORDERS ---------------- */}
        {activeTab === 'orders' && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ margin: 0, color: '#8B5E83', fontSize: '1.2rem' }}>All Orders ({orders.length})</h3>
              <div style={{ display: 'flex', gap: '8px', backgroundColor: '#FAF4F6', padding: '4px', borderRadius: '12px', flexWrap: 'wrap' }}>
                {['All', ...STATUS_OPTIONS].map((tab) => (
                  <button key={tab} onClick={() => setOrderFilter(tab)} style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', backgroundColor: orderFilter === tab ? '#D87093' : 'transparent', color: orderFilter === tab ? '#fff' : '#666', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #FAF4F6' }}>
                    <th style={{ padding: '12px', color: '#a0aec0', fontSize: '0.75rem', fontWeight: 700 }}>ORDER ID</th>
                    <th style={{ padding: '12px', color: '#a0aec0', fontSize: '0.75rem', fontWeight: 700 }}>CUSTOMER</th>
                    <th style={{ padding: '12px', color: '#a0aec0', fontSize: '0.75rem', fontWeight: 700 }}>ITEMS</th>
                    <th style={{ padding: '12px', color: '#a0aec0', fontSize: '0.75rem', fontWeight: 700 }}>PHONE / ADDRESS</th>
                    <th style={{ padding: '12px', color: '#a0aec0', fontSize: '0.75rem', fontWeight: 700 }}>TOTAL</th>
                    <th style={{ padding: '12px', color: '#a0aec0', fontSize: '0.75rem', fontWeight: 700 }}>STATUS</th>
                    <th style={{ padding: '12px', color: '#a0aec0', fontSize: '0.75rem', fontWeight: 700 }}>UPDATE</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: '#aaa' }}>No orders match this filter.</td></tr>
                  )}
                  {filteredOrders.map((order) => {
                    const badge = getStatusBadgeStyle(order.status);
                    return (
                      <tr key={order.id} style={{ borderBottom: '1px solid #FAF4F6' }}>
                        <td style={{ padding: '14px 12px', fontWeight: 600, color: '#333', fontSize: '0.85rem' }}>#{order.id}</td>
                        <td style={{ padding: '14px 12px', fontSize: '0.85rem' }}>{order.customerName}</td>
                        <td style={{ padding: '14px 12px', color: '#D87093', fontWeight: 600, fontSize: '0.8rem' }}>
                          {order.items?.map((i, idx) => <div key={idx}>{i.name} × {i.quantity}</div>)}
                        </td>
                        <td style={{ padding: '14px 12px', color: '#888', fontSize: '0.78rem' }}>
                          {order.customerPhone}<br />{order.customerAddress}
                        </td>
                        <td style={{ padding: '14px 12px', fontWeight: 600, fontSize: '0.88rem' }}>${Number(order.totalPrice).toFixed(2)}</td>
                        <td style={{ padding: '14px 12px' }}>
                          <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: badge.backgroundColor, color: badge.color }}>{badge.label}</span>
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <select value={order.status} onChange={(e) => handleStatusChange(order.id, e.target.value)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #FFE4E8', backgroundColor: '#fff', fontSize: '0.82rem' }}>
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------------- MENU MANAGEMENT ---------------- */}
        {activeTab === 'menu' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {Object.keys(CATEGORY_META).map((catKey) => (
                  <button key={catKey} onClick={() => setMenuCategory(catKey)} style={pillBtn(menuCategory === catKey)}>{CATEGORY_META[catKey].title}</button>
                ))}
              </div>
              <button onClick={openAddModal} style={{ backgroundColor: '#D87093', color: '#fff', border: 'none', padding: '11px 20px', borderRadius: '22px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(216,112,147,0.35)' }}>
                + Add Item to {CATEGORY_META[menuCategory].title}
              </button>
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 18px 0', color: '#8B5E83', borderBottom: '2px solid #FAF4F6', paddingBottom: '8px' }}>
                {CATEGORY_META[menuCategory].title} — {categoryProducts.length} item{categoryProducts.length !== 1 ? 's' : ''}
              </h3>

              {categoryProducts.length === 0 ? (
                <p style={{ color: '#aaa', textAlign: 'center', padding: '30px 0' }}>No items in this category yet. Add your first one!</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
                  {categoryProducts.map((item) => (
                    <div key={item.id} style={{ backgroundColor: '#FFF0F5', padding: '14px', borderRadius: '14px', border: '1px solid #FFE4E8', display: 'flex', flexDirection: 'column' }}>
                      <img src={item.img} alt={item.name} style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '10px', marginBottom: '10px' }} />
                      <span style={{ fontSize: '11px', backgroundColor: '#E2F0CB', color: '#4A6B22', padding: '3px 8px', borderRadius: '10px', fontWeight: 700, alignSelf: 'flex-start' }}>{item.tag}</span>
                      <h4 style={{ margin: '8px 0 4px 0', color: '#333', fontSize: '0.95rem' }}>{item.name}</h4>
                      <div style={{ fontWeight: 700, color: '#D87093', marginBottom: '12px' }}>${Number(item.price).toFixed(2)}</div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                        <button onClick={() => openEditModal(item)} style={{ flex: 1, backgroundColor: '#E8DFF5', color: '#6b4f8f', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}>✎ Edit</button>
                        <button onClick={() => requestDeleteProduct(item.id)} style={{ flex: 1, backgroundColor: '#f8d7da', color: '#a33b57', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}>🗑 Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------- REVIEWS ---------------- */}
        {activeTab === 'reviews' && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0, color: '#8B5E83' }}>Customer Reviews ({reviews.length})</h3>
              <div style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '8px 16px', borderRadius: '14px', fontWeight: 700, fontSize: '0.85rem' }}>Avg Rating: {avgRating} ★</div>
            </div>

            {reviews.length === 0 ? (
              <p style={{ color: '#aaa', textAlign: 'center', padding: '30px 0' }}>No reviews yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '18px' }}>
                {reviews.map((r) => (
                  <div key={r.id} style={{ backgroundColor: '#FFF0F5', padding: '18px', borderRadius: '14px', border: '1px solid #FFE4E8' }}>
                    <div style={{ color: '#FFB84D', fontSize: '15px', marginBottom: '6px' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                    <p style={{ color: '#555', fontSize: '14px', lineHeight: '1.5', margin: '0 0 10px 0' }}>"{r.comment}"</p>
                    <div style={{ fontWeight: 700, color: '#8B5E83', fontSize: '13px' }}>{r.name}</div>
                    <button onClick={() => requestDeleteReview(r.id)} style={{ marginTop: '10px', backgroundColor: '#f8d7da', color: '#a33b57', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}>🗑 Remove Review</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---------------- ADD / EDIT PRODUCT MODAL ---------------- */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '20px', width: '100%', maxWidth: '450px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h3 style={{ margin: 0, color: '#D87093' }}>{editingId !== null ? 'Edit Item' : 'Add New Item'}</h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#aaa' }}>✕</button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: '4px' }}>Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #FFE4E8' }}>
                  {Object.keys(CATEGORY_META).map((k) => <option key={k} value={k}>{CATEGORY_META[k].title}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: '4px' }}>Item Name</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #FFE4E8', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: '4px' }}>Price ($)</label>
                <input type="number" step="0.01" min="0" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #FFE4E8', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: '4px' }}>Tag</label>
                <input type="text" placeholder="Best Seller" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #FFE4E8', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: '4px' }}>Image URL</label>
                <input type="text" placeholder="https://..." value={form.img} onChange={(e) => setForm({ ...form, img: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #FFE4E8', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={closeModal} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #FFE4E8', backgroundColor: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#D87093', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  {editingId !== null ? 'Save Changes' : 'Publish Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- DELETE CONFIRMATION MODAL ---------------- */}
      {confirmDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', padding: '1.8rem', borderRadius: '18px', width: '100%', maxWidth: '360px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>{confirmDelete.type === 'product' ? 'Delete this item?' : 'Remove this review?'}</h3>
            <p style={{ color: '#888', fontSize: '0.88rem', marginBottom: '20px' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #FFE4E8', backgroundColor: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmDeleteAction} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#e05c78', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}