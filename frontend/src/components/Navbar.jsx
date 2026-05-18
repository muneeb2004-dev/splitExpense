import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;
  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <nav style={{
        background: 'rgba(10, 15, 30, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '0 24px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <Link to="/" onClick={closeMenu} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
          }}>
            <div style={{
              width: '32px', height: '32px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
            }}>💸</div>
            <span style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #a5b4fc, #818cf8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em',
            }}>SplitWise</span>
          </Link>

          {/* Desktop Nav */}
          <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {user ? (
              <>
                <Link to="/dashboard" style={{
                  fontSize: '0.85rem', padding: '6px 14px', borderRadius: '8px',
                  textDecoration: 'none',
                  color: isActive('/dashboard') ? '#a5b4fc' : 'var(--text-secondary)',
                  background: isActive('/dashboard') ? 'rgba(99,102,241,0.15)' : 'transparent',
                  transition: 'all 0.2s', fontWeight: 500,
                }}>Dashboard</Link>
                <Link to="/groups" style={{
                  fontSize: '0.85rem', padding: '6px 14px', borderRadius: '8px',
                  textDecoration: 'none',
                  color: isActive('/groups') ? '#a5b4fc' : 'var(--text-secondary)',
                  background: isActive('/groups') ? 'rgba(99,102,241,0.15)' : 'transparent',
                  transition: 'all 0.2s', fontWeight: 500,
                }}>Groups</Link>
                <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '4px 14px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '999px',
                }}>
                  <div style={{
                    width: '28px', height: '28px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 700, color: 'white', flexShrink: 0,
                  }}>{user.name?.charAt(0).toUpperCase()}</div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {user.name}
                  </span>
                </div>
                <button onClick={handleLogout} style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                  color: '#f87171', padding: '6px 14px', borderRadius: '8px',
                  fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
                }}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" style={{
                  fontSize: '0.875rem', color: 'var(--text-secondary)', textDecoration: 'none',
                  padding: '7px 16px', borderRadius: '8px', fontWeight: 500,
                }}>Login</Link>
                <Link to="/register" className="btn-primary" style={{
                  textDecoration: 'none', padding: '7px 18px', borderRadius: '8px', fontSize: '0.875rem',
                }}>Register</Link>
              </>
            )}
          </div>

          {/* Hamburger (mobile only) */}
          <button
            className={`hamburger${menuOpen ? ' open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`mobile-menu${menuOpen ? ' open' : ''}`}>
        {user ? (
          <>
            {/* User info */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '10px',
              marginBottom: '4px',
            }}>
              <div style={{
                width: '36px', height: '36px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '15px', fontWeight: 700, color: 'white', flexShrink: 0,
              }}>{user.name?.charAt(0).toUpperCase()}</div>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{user.name}</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{user.email}</p>
              </div>
            </div>
            <Link to="/dashboard" onClick={closeMenu}
              style={{ background: isActive('/dashboard') ? 'rgba(99,102,241,0.15)' : undefined, color: isActive('/dashboard') ? '#a5b4fc' : undefined }}>
              📊 Dashboard
            </Link>
            <Link to="/groups" onClick={closeMenu}
              style={{ background: isActive('/groups') ? 'rgba(99,102,241,0.15)' : undefined, color: isActive('/groups') ? '#a5b4fc' : undefined }}>
              👥 Groups
            </Link>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
            <button onClick={handleLogout} style={{
              background: 'rgba(239,68,68,0.08)', color: '#f87171',
              border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}>
              🚪 Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" onClick={closeMenu}>🔑 Login</Link>
            <Link to="/register" onClick={closeMenu} style={{
              background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
            }}>✨ Register</Link>
          </>
        )}
      </div>

      {/* Backdrop to close menu */}
      {menuOpen && (
        <div onClick={closeMenu} style={{
          position: 'fixed', inset: 0, zIndex: 98,
        }} />
      )}
    </>
  );
}
