import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api';

// Static per-category display info (image/description for the category header).
// Actual items always come live from the backend.
const CATEGORY_META = {
  cakes: { title: 'Cakes 🎂', img: 'https://images.unsplash.com/photo-1558301211-0d8c8ddee6ec?auto=format&fit=crop&w=600&q=80', description: 'Handcrafted signature sponges iced with light buttercream. Perfect for birthdays, gifts, or personal sweet cravings.' },
  wedding: { title: 'Wedding Cakes 💍', img: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=600&q=80', description: 'Handcrafted multi-tiered masterpieces featuring delicate sugar florals, pastel color palettes, and gourmet flavor combinations.' },
  brownies: { title: 'Fudgy Brownies 🍫', img: 'https://images.unsplash.com/photo-1636743715220-d8f8dd900b87?auto=format&fit=crop&w=600&q=80', description: 'Rich, gooey dark chocolate brownies baked fresh daily with shiny crackly tops and premium Belgian chocolate chunks.' },
  donuts: { title: 'Donuts 🍩', img: 'https://images.unsplash.com/photo-1706616999454-91cbfd264e32?auto=format&fit=crop&w=600&q=80', description: 'Handcrafted artisan glazed, filled, and frosted doughnuts baked fresh every morning in vibrant pastel colors.' },
  cupcakes: { title: 'Cupcakes 🧁', img: 'https://plus.unsplash.com/premium_photo-1669931367700-e4e1e0387d40?auto=format&fit=crop&w=600&q=80', description: 'Soft, moist cupcakes piped with swirls of buttercream in every pastel shade, baked fresh each morning in small batches.' }
};

const pinkBtn = { backgroundColor: '#D87093', color: '#FFF', border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' };
const cardStyle = { backgroundColor: '#FFF', borderRadius: '20px', padding: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #FFE4E8' };

function CustomerDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState('donuts');

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [cart, setCart] = useState([]);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartMessage, setCartMessage] = useState('');

  const [myOrders, setMyOrders] = useState([]);

  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [reviewError, setReviewError] = useState('');

  const [checkoutInfo, setCheckoutInfo] = useState({ phone: user?.phone || '', address: user?.address || '' });
  const [checkoutStatus, setCheckoutStatus] = useState('');

  // ---------------- Data loading ----------------
  const loadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const loadCart = useCallback(async () => {
    try {
      const data = await api.getCart();
      setCart(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const data = await api.getMyOrders();
      setMyOrders(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadReviews = useCallback(async () => {
    try {
      const data = await api.getReviews();
      setReviews(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadCart();
    loadReviews();
  }, [loadProducts, loadCart, loadReviews]);

  useEffect(() => {
    if (activeTab === 'orders') loadOrders();
    if (activeTab === 'cart') loadCart();
  }, [activeTab, loadOrders, loadCart]);

  // ---------------- Cart actions ----------------
  const handleAddToCart = async (productId, name) => {
    try {
      await api.addToCart(productId, 1);
      setCartMessage(`${name} added to cart!`);
      loadCart();
      setTimeout(() => setCartMessage(''), 2000);
    } catch (err) {
      setCartMessage(err.message);
    }
  };

  const handleQtyChange = async (productId, newQty) => {
    setCartLoading(true);
    try {
      await api.updateCartItem(productId, newQty);
      await loadCart();
    } catch (err) {
      console.error(err);
    } finally {
      setCartLoading(false);
    }
  };

  const handleRemoveFromCart = async (productId) => {
    setCartLoading(true);
    try {
      await api.removeFromCart(productId);
      await loadCart();
    } catch (err) {
      console.error(err);
    } finally {
      setCartLoading(false);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async (e) => {
    e.preventDefault();
    setCheckoutStatus('placing');
    try {
      await api.checkout(checkoutInfo);
      setCheckoutStatus('success');
      await loadCart();
    } catch (err) {
      setCheckoutStatus('error:' + err.message);
    }
  };

  // ---------------- Reviews ----------------
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewError('');
    if (!newReview.comment.trim()) {
      setReviewError('Please write a comment.');
      return;
    }
    try {
      await api.addReview(newReview);
      setNewReview({ rating: 5, comment: '' });
      loadReviews();
    } catch (err) {
      setReviewError(err.message);
    }
  };

  // ---------------- Derived ----------------
  const categoryItems = products.filter(p => p.category === selectedCategory);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div style={{ backgroundColor: '#FAF4F6', minHeight: '100vh', fontFamily: "'Poppins', sans-serif", color: '#4A4A4A' }}>

      {/* NAVBAR */}
      <nav style={{ backgroundColor: '#FFF0F5', padding: '18px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', borderBottom: '2px solid #FFE4E8', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ margin: 0, color: '#D87093', fontSize: '26px', fontFamily: "'Georgia', serif", letterSpacing: '1px' }}>
          🎂 SweetCraft Bakery
        </h1>
        <div style={{ display: 'flex', gap: '22px', alignItems: 'center', flexWrap: 'wrap' }}>
          {['home', 'menu', 'about', 'policies', 'reviews'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: 'none', border: 'none', fontSize: '15px',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              color: activeTab === tab ? '#D87093' : '#666',
              borderBottom: activeTab === tab ? '2px solid #D87093' : '2px solid transparent',
              paddingBottom: '4px', cursor: 'pointer', textTransform: 'capitalize'
            }}>
              {tab === 'home' ? 'Home' : tab === 'menu' ? 'Our Offerings' : tab === 'about' ? 'Our Story' : tab === 'policies' ? 'Policies' : 'Reviews'}
            </button>
          ))}
          <button onClick={() => setActiveTab('orders')} style={{ background: 'none', border: 'none', fontSize: '15px', fontWeight: activeTab === 'orders' ? 'bold' : 'normal', color: activeTab === 'orders' ? '#D87093' : '#666', cursor: 'pointer' }}>
            My Orders
          </button>
          <button onClick={() => setActiveTab('cart')} style={{ position: 'relative', background: '#FFE4E8', border: 'none', borderRadius: '16px', padding: '8px 14px', fontSize: '14px', fontWeight: 'bold', color: '#D87093', cursor: 'pointer' }}>
            🛒 Cart {cartCount > 0 && `(${cartCount})`}
          </button>
          <button onClick={onLogout} style={{ background: 'none', border: '1px solid #D87093', color: '#D87093', padding: '6px 14px', borderRadius: '15px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '30px auto', padding: '0 20px' }}>

        {/* TAB: MENU */}
        {activeTab === 'menu' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '30px', flexWrap: 'wrap' }}>
              {Object.keys(CATEGORY_META).map((catKey) => (
                <button key={catKey} onClick={() => setSelectedCategory(catKey)} style={{
                  padding: '10px 20px', borderRadius: '20px', border: 'none',
                  backgroundColor: selectedCategory === catKey ? '#D87093' : '#E8DFF5',
                  color: selectedCategory === catKey ? '#FFF' : '#555', fontWeight: 'bold', cursor: 'pointer'
                }}>
                  {CATEGORY_META[catKey].title}
                </button>
              ))}
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', gap: '30px', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap' }}>
                <img src={CATEGORY_META[selectedCategory].img} alt={CATEGORY_META[selectedCategory].title} style={{ width: '220px', height: '220px', objectFit: 'cover', borderRadius: '15px' }} />
                <div>
                  <h2 style={{ margin: '0 0 10px 0', color: '#D87093' }}>{CATEGORY_META[selectedCategory].title}</h2>
                  <p style={{ color: '#666', lineHeight: '1.6', fontSize: '15px' }}>{CATEGORY_META[selectedCategory].description}</p>
                </div>
              </div>

              <h3 style={{ color: '#8B5E83', borderBottom: '2px solid #FAF4F6', paddingBottom: '8px' }}>
                Available Items ({categoryItems.length})
              </h3>

              {cartMessage && <div style={{ color: '#4A6B22', backgroundColor: '#E2F0CB', padding: '10px 14px', borderRadius: '10px', marginTop: '14px', fontSize: '13px', fontWeight: 'bold' }}>{cartMessage}</div>}

              {loadingProducts ? (
                <p style={{ color: '#999', textAlign: 'center', padding: '30px' }}>Loading menu…</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px', marginTop: '15px' }}>
                  {categoryItems.map((item) => (
                    <div key={item.id} style={{ backgroundColor: '#FFF0F5', padding: '15px', borderRadius: '12px', border: '1px solid #FFE4E8', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <img src={item.img} alt={item.name} style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '10px', marginBottom: '12px' }} />
                        <span style={{ fontSize: '11px', backgroundColor: '#E2F0CB', color: '#4A6B22', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold' }}>{item.tag}</span>
                        <h4 style={{ margin: '8px 0 4px 0', color: '#333' }}>{item.name}</h4>
                        <div style={{ fontWeight: 'bold', color: '#D87093', marginBottom: '12px' }}>${Number(item.price).toFixed(2)}</div>
                      </div>
                      <button onClick={() => handleAddToCart(item.id, item.name)} style={{ ...pinkBtn, padding: '8px 12px', fontSize: '13px', width: '100%' }}>
                        Add to Cart 🛒
                      </button>
                    </div>
                  ))}
                  {categoryItems.length === 0 && <p style={{ color: '#aaa' }}>No items in this category yet.</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: CART */}
        {activeTab === 'cart' && (
          <div style={cardStyle}>
            <h2 style={{ margin: '0 0 20px 0', color: '#D87093' }}>Your Cart</h2>

            {cart.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: '30px 0' }}>Your cart is empty. Head to Our Offerings to add something sweet!</p>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                  {cart.map((item) => (
                    <div key={item.productId} style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: '#FFF0F5', borderRadius: '12px', padding: '12px', border: '1px solid #FFE4E8', opacity: cartLoading ? 0.6 : 1 }}>
                      <img src={item.img} alt={item.name} style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '10px' }} />
                      <div style={{ flex: 1, minWidth: '140px' }}>
                        <div style={{ fontWeight: 'bold', color: '#333', fontSize: '14px' }}>{item.name}</div>
                        <div style={{ color: '#D87093', fontWeight: 'bold', fontSize: '13px' }}>${Number(item.price).toFixed(2)} each</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button disabled={cartLoading} onClick={() => handleQtyChange(item.productId, item.quantity - 1)} style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid #FFE4E8', backgroundColor: '#FFF', cursor: 'pointer', fontWeight: 'bold' }}>−</button>
                        <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</span>
                        <button disabled={cartLoading} onClick={() => handleQtyChange(item.productId, item.quantity + 1)} style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid #FFE4E8', backgroundColor: '#FFF', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                      </div>
                      <div style={{ fontWeight: 'bold', color: '#333', minWidth: '70px', textAlign: 'right' }}>${(item.price * item.quantity).toFixed(2)}</div>
                      <button disabled={cartLoading} onClick={() => handleRemoveFromCart(item.productId)} style={{ background: 'none', border: 'none', color: '#C0475F', cursor: 'pointer', fontSize: '16px' }} title="Remove">✕</button>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '2px solid #FAF4F6', paddingTop: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>Total</span>
                  <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#D87093' }}>${cartTotal.toFixed(2)}</span>
                </div>

                {checkoutStatus === 'success' ? (
                  <div style={{ backgroundColor: '#E2F0CB', color: '#4A6B22', padding: '16px', borderRadius: '12px', textAlign: 'center', fontWeight: 'bold' }}>
                    🎉 Order placed! Track it under "My Orders".
                  </div>
                ) : (
                  <form onSubmit={handleCheckout}>
                    <h3 style={{ color: '#8B5E83', fontSize: '15px', marginBottom: '10px' }}>Delivery Details</h3>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
                      <input type="tel" required placeholder="Phone number" value={checkoutInfo.phone} onChange={(e) => setCheckoutInfo({ ...checkoutInfo, phone: e.target.value })} style={{ flex: 1, minWidth: '160px', padding: '10px 14px', borderRadius: '10px', border: '1px solid #FFE4E8' }} />
                      <input type="text" required placeholder="Delivery address" value={checkoutInfo.address} onChange={(e) => setCheckoutInfo({ ...checkoutInfo, address: e.target.value })} style={{ flex: 2, minWidth: '200px', padding: '10px 14px', borderRadius: '10px', border: '1px solid #FFE4E8' }} />
                    </div>
                    {checkoutStatus.startsWith('error:') && <div style={{ color: '#C0475F', fontSize: '13px', marginBottom: '10px' }}>{checkoutStatus.replace('error:', '')}</div>}
                    <button type="submit" disabled={checkoutStatus === 'placing'} style={{ ...pinkBtn, padding: '13px 26px', fontSize: '15px', width: '100%' }}>
                      {checkoutStatus === 'placing' ? 'Placing order…' : 'Place Order (Cash on Delivery)'}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB: MY ORDERS */}
        {activeTab === 'orders' && (
          <div style={cardStyle}>
            <h2 style={{ margin: '0 0 20px 0', color: '#D87093' }}>My Orders</h2>
            {myOrders.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: '30px 0' }}>No orders yet. Your placed orders will show up here.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {myOrders.map((order) => (
                  <div key={order.id} style={{ backgroundColor: '#FFF0F5', borderRadius: '14px', padding: '16px', border: '1px solid #FFE4E8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 'bold', color: '#333' }}>Order #{order.id}</span>
                      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#FCE4EC', color: '#B5507A' }}>{order.status}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      {order.items.map((i, idx) => (
                        <div key={idx}>{i.name} × {i.quantity}</div>
                      ))}
                    </div>
                    <div style={{ marginTop: '8px', fontWeight: 'bold', color: '#D87093' }}>Total: ${Number(order.totalPrice).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: HOME */}
        {activeTab === 'home' && (
          <div>
            <div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', marginBottom: '40px', boxShadow: '0 8px 25px rgba(0,0,0,0.08)' }}>
              <img src="https://images.unsplash.com/photo-1657498023828-1e0181449d9f?auto=format&fit=crop&w=1200&q=80" alt="SweetCraft Bakery display" style={{ width: '100%', height: '340px', objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.85) 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '30px' }}>
                <h1 style={{ color: '#FFF', fontSize: '32px', margin: '0 0 8px 0', fontFamily: "'Georgia', serif", textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}>Welcome, {user?.name || 'friend'}! 🎂</h1>
                <p style={{ color: '#FFF0F5', fontSize: '15px', margin: '0 0 18px 0', maxWidth: '520px', textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>
                  Handcrafted cakes, brownies, cupcakes and donuts baked fresh every day with real ingredients and a lot of pastel-colored love.
                </p>
                <button onClick={() => setActiveTab('menu')} style={{ alignSelf: 'flex-start', ...pinkBtn, padding: '12px 26px', fontSize: '14px' }}>
                  Explore Our Offerings →
                </button>
              </div>
            </div>

            <h3 style={{ color: '#8B5E83', marginBottom: '16px' }}>Shop by Category</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '18px', marginBottom: '40px' }}>
              {Object.keys(CATEGORY_META).map((catKey) => (
                <div key={catKey} onClick={() => { setSelectedCategory(catKey); setActiveTab('menu'); }} style={{ borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', border: '1px solid #FFE4E8', backgroundColor: '#FFF', boxShadow: '0 3px 10px rgba(0,0,0,0.04)' }}>
                  <img src={CATEGORY_META[catKey].img} alt={CATEGORY_META[catKey].title} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 'bold', color: '#333', fontSize: '15px' }}>{CATEGORY_META[catKey].title}</div>
                    <div style={{ color: '#D87093', fontSize: '12px', fontWeight: 'bold', marginTop: '4px' }}>
                      {products.filter(p => p.category === catKey).length} items →
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '18px' }}>
              {[
                { icon: '🌸', title: 'Baked Fresh Daily', text: 'Every item is made from scratch each morning.' },
                { icon: '🚚', title: 'Local Delivery', text: 'Same-day delivery across the city.' },
                { icon: '💝', title: 'Custom Orders', text: 'Personalized cakes for any occasion.' }
              ].map((h, i) => (
                <div key={i} style={{ backgroundColor: '#FFF0F5', borderRadius: '16px', padding: '20px', textAlign: 'center', border: '1px solid #FFE4E8' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>{h.icon}</div>
                  <div style={{ fontWeight: 'bold', color: '#8B5E83', marginBottom: '4px' }}>{h.title}</div>
                  <div style={{ color: '#777', fontSize: '13px' }}>{h.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: ABOUT */}
        {activeTab === 'about' && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', gap: '30px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '30px' }}>
              <img src="https://images.unsplash.com/photo-1726981897420-0778c14deedf?auto=format&fit=crop&w=500&q=80" alt="SweetCraft Bakery display case" style={{ width: '260px', height: '260px', objectFit: 'cover', borderRadius: '15px', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: '260px' }}>
                <h2 style={{ margin: '0 0 10px 0', color: '#D87093' }}>Our Story</h2>
                <p style={{ color: '#666', lineHeight: '1.7', fontSize: '15px' }}>
                  SweetCraft Bakery started as a tiny home kitchen project, mixing batter one pastel cake at a time.
                  Today we bake everything fresh every morning — cakes, wedding tiers, fudgy brownies, cupcakes and
                  donuts — using real butter, real fruit, and no shortcuts. Every order still gets the same care
                  as our very first cake.
                </p>
              </div>
            </div>
            <h3 style={{ color: '#8B5E83', borderBottom: '2px solid #FAF4F6', paddingBottom: '8px', marginBottom: '18px' }}>What Makes Us Different</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px' }}>
              {[
                { icon: '🧈', title: 'Real Ingredients', text: 'Real butter, fresh eggs, no artificial shortcuts.' },
                { icon: '👩‍🍳', title: 'Handmade Daily', text: 'Every cake and pastry is baked and decorated by hand.' },
                { icon: '🎨', title: 'Made to Order', text: 'Colors, flavors, and messages tailored to you.' },
                { icon: '💗', title: 'Community First', text: 'Proudly serving our neighborhood, one order at a time.' }
              ].map((v, i) => (
                <div key={i} style={{ backgroundColor: '#FFF0F5', padding: '18px', borderRadius: '14px', border: '1px solid #FFE4E8', textAlign: 'center' }}>
                  <div style={{ fontSize: '26px', marginBottom: '8px' }}>{v.icon}</div>
                  <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '4px', fontSize: '14px' }}>{v.title}</div>
                  <div style={{ color: '#777', fontSize: '13px' }}>{v.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: POLICIES */}
        {activeTab === 'policies' && (
          <div style={cardStyle}>
            <h2 style={{ margin: '0 0 20px 0', color: '#D87093' }}>Store Policies</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
              {[
                { icon: '🧁', title: 'Ordering', text: 'Standard items can be ordered anytime through the menu. Custom cakes need at least 48 hours notice.' },
                { icon: '💳', title: 'Payment', text: 'We accept cash on delivery. Custom orders require 50% advance payment.' },
                { icon: '🚚', title: 'Delivery', text: 'Same-day delivery available for orders placed before 2 PM. Delivery fee depends on distance.' },
                { icon: '↩️', title: 'Cancellations & Refunds', text: 'Orders can be cancelled up to 24 hours before pickup/delivery for a full refund. Custom cakes are non-refundable once baking has started.' },
                { icon: '🥜', title: 'Allergies', text: 'Our kitchen handles nuts, dairy, eggs, and gluten. Please tell us about any allergies before ordering.' },
                { icon: '📦', title: 'Storage', text: 'Cakes and pastries are best enjoyed within 2 days. Refrigerate cream-based items immediately.' }
              ].map((p, i) => (
                <div key={i} style={{ backgroundColor: '#FFF0F5', padding: '20px', borderRadius: '14px', border: '1px solid #FFE4E8' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{p.icon}</div>
                  <div style={{ fontWeight: 'bold', color: '#8B5E83', marginBottom: '6px' }}>{p.title}</div>
                  <div style={{ color: '#666', fontSize: '13px', lineHeight: '1.6' }}>{p.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: REVIEWS */}
        {activeTab === 'reviews' && (
          <div>
            <div style={{ ...cardStyle, marginBottom: '25px' }}>
              <h2 style={{ margin: '0 0 20px 0', color: '#D87093' }}>Customer Reviews</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '18px' }}>
                {reviews.map((r) => (
                  <div key={r.id} style={{ backgroundColor: '#FFF0F5', padding: '18px', borderRadius: '14px', border: '1px solid #FFE4E8' }}>
                    <div style={{ color: '#FFB84D', fontSize: '15px', marginBottom: '6px' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                    <p style={{ color: '#555', fontSize: '14px', lineHeight: '1.5', margin: '0 0 10px 0' }}>"{r.comment}"</p>
                    <div style={{ fontWeight: 'bold', color: '#8B5E83', fontSize: '13px' }}>{r.name}</div>
                  </div>
                ))}
                {reviews.length === 0 && <p style={{ color: '#aaa' }}>No reviews yet — be the first!</p>}
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 18px 0', color: '#8B5E83' }}>Leave a Review</h3>
              <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '500px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', color: '#666' }}>Rating:</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} onClick={() => setNewReview({ ...newReview, rating: star })} style={{ cursor: 'pointer', fontSize: '20px', color: star <= newReview.rating ? '#FFB84D' : '#DDD' }}>★</span>
                  ))}
                </div>
                <textarea placeholder="Tell us what you thought..." value={newReview.comment} onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })} rows={4} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #FFE4E8', fontSize: '14px', fontFamily: "'Poppins', sans-serif", resize: 'vertical' }} />
                {reviewError && <div style={{ color: '#C0475F', fontSize: '13px' }}>{reviewError}</div>}
                <button type="submit" style={{ ...pinkBtn, padding: '10px 20px', alignSelf: 'flex-start' }}>Submit Review</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerDashboard;