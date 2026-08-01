import React, { useState, useEffect } from 'react';
import CustomerDashboard from './customerdashboard';
import AdminDashboard from './AdminDashboard';
import { api, saveSession, loadSession, clearSession } from './api';

// ============================================================
// SweetCraft Bakery — Auth Gate (Login + Register)
// Talks to the real backend now: POST /api/auth/login and
// POST /api/auth/register. Session (token + user) is kept in
// localStorage so a refresh doesn't log the person out.
// ============================================================

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: '10px',
  border: '1px solid #FFE4E8',
  boxSizing: 'border-box',
  fontFamily: "'Poppins', sans-serif",
  fontSize: '14px'
};

const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#555', marginBottom: '6px' };

function AuthShell({ children, subtitle }) {
  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#FAF4F6', fontFamily: "'Poppins', sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#FFF', borderRadius: '24px', border: '1px solid #FFE4E8',
        boxShadow: '0 8px 30px rgba(0,0,0,0.06)', padding: '40px', width: '100%', maxWidth: '420px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ margin: 0, color: '#D87093', fontSize: '28px', fontFamily: "'Georgia', serif", letterSpacing: '1px' }}>
            🎂 SweetCraft Bakery
          </h1>
          <p style={{ color: '#8B5E83', fontSize: '13px', marginTop: '6px' }}>{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function LoginPage({ onLogin, goToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login({ email, password });
      saveSession(data.token, data.user);
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell subtitle="Sign in to continue">
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Email</label>
          <input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={labelStyle}>Password</label>
          <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
        </div>

        {error && <div style={{ color: '#C0475F', fontSize: '13px', marginBottom: '10px' }}>{error}</div>}

        <button type="submit" disabled={loading} style={{
          width: '100%', backgroundColor: '#D87093', color: '#FFF', border: 'none', padding: '13px',
          borderRadius: '25px', fontWeight: 'bold', fontSize: '15px', cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.7 : 1, marginTop: '8px'
        }}>
          {loading ? 'Signing in…' : 'Login'}
        </button>
      </form>

      <p style={{ textAlign: 'center', color: '#8B5E83', fontSize: '13px', marginTop: '18px' }}>
        New here?{' '}
        <button onClick={goToRegister} style={{ background: 'none', border: 'none', color: '#D87093', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', padding: 0 }}>
          Create an account
        </button>
      </p>
      <p style={{ textAlign: 'center', color: '#B5A0AC', fontSize: '11px', marginTop: '10px' }}>
        Admin/baker accounts log in here too — the dashboard you see depends on your account role.
      </p>
    </AuthShell>
  );
}

function RegisterPage({ onLogin, goToLogin }) {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '', phone: '', address: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        address: form.address
      });
      saveSession(data.token, data.user);
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell subtitle="Create your account">
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Full Name</label>
          <input type="text" required placeholder="Areeba Ahsan" value={form.fullName} onChange={update('fullName')} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Email</label>
          <input type="email" required placeholder="you@example.com" value={form.email} onChange={update('email')} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Phone Number</label>
          <input type="tel" required placeholder="03xx-xxxxxxx" value={form.phone} onChange={update('phone')} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Delivery Address</label>
          <textarea required rows={2} placeholder="House #, street, area, city" value={form.address} onChange={update('address')} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Password</label>
          <input type="password" required placeholder="At least 6 characters" value={form.password} onChange={update('password')} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={labelStyle}>Confirm Password</label>
          <input type="password" required placeholder="••••••••" value={form.confirmPassword} onChange={update('confirmPassword')} style={inputStyle} />
        </div>

        {error && <div style={{ color: '#C0475F', fontSize: '13px', marginBottom: '10px' }}>{error}</div>}

        <button type="submit" disabled={loading} style={{
          width: '100%', backgroundColor: '#D87093', color: '#FFF', border: 'none', padding: '13px',
          borderRadius: '25px', fontWeight: 'bold', fontSize: '15px', cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.7 : 1, marginTop: '8px'
        }}>
          {loading ? 'Creating account…' : 'Sign Up'}
        </button>
      </form>

      <p style={{ textAlign: 'center', color: '#8B5E83', fontSize: '13px', marginTop: '18px' }}>
        Already have an account?{' '}
        <button onClick={goToLogin} style={{ background: 'none', border: 'none', color: '#D87093', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', padding: 0 }}>
          Log in
        </button>
      </p>
    </AuthShell>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'

  // Restore session on refresh
  useEffect(() => {
    const session = loadSession();
    if (session) setUser(session.user);
  }, []);

  const handleLogin = (loggedInUser) => setUser(loggedInUser);
  const handleLogout = () => {
    clearSession();
    setUser(null);
    setAuthView('login');
  };

  if (!user) {
    return authView === 'login'
      ? <LoginPage onLogin={handleLogin} goToRegister={() => setAuthView('register')} />
      : <RegisterPage onLogin={handleLogin} goToLogin={() => setAuthView('login')} />;
  }

  if (user.role === 'ADMIN') {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }

  return <CustomerDashboard user={user} onLogout={handleLogout} />;
}