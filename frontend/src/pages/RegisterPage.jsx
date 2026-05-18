import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/groups');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 60px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div className="auth-card" style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        padding: '40px',
        width: '100%',
        maxWidth: '420px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '56px', height: '56px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: '16px',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', marginBottom: '16px',
            boxShadow: '0 8px 24px rgba(16,185,129,0.4)',
          }}>🎉</div>
          <h1 style={{
            fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em',
            color: 'var(--text-primary)', marginBottom: '6px',
          }}>Create account</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Join SplitWise and start splitting expenses
          </p>
        </div>

        {error && <div className="alert-error" style={{ marginBottom: '20px' }}>⚠ {error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Full name</label>
            <input type="text" name="name" value={form.name} onChange={handleChange}
              required placeholder="John Doe" className="input-field" />
          </div>
          <div>
            <label className="form-label">Email address</label>
            <input type="email" name="email" value={form.email} onChange={handleChange}
              required placeholder="you@example.com" className="input-field" />
          </div>
          <div>
            <label className="form-label">Password</label>
            <input type="password" name="password" value={form.password} onChange={handleChange}
              required minLength={6} placeholder="Minimum 6 characters" className="input-field" />
          </div>
          <button type="submit" disabled={loading} className="btn-success"
            style={{ width: '100%', padding: '12px', fontSize: '0.95rem', marginTop: '4px' }}>
            {loading ? 'Creating account…' : 'Create Account →'}
          </button>
        </form>

        <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#a5b4fc', textDecoration: 'none', fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
