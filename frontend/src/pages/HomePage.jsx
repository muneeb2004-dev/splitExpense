import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const features = [
  { icon: '👥', title: 'Create Groups', desc: 'Organize expenses with friends, roommates, or colleagues in dedicated groups.' },
  { icon: '💳', title: 'Track Expenses', desc: 'Log expenses with categories, split them evenly or set custom shares per person.' },
  { icon: '⚖️', title: 'Smart Balances', desc: 'Real-time balance calculation showing exactly who owes whom and how much.' },
  { icon: '✅', title: 'Settle Up', desc: 'Record payments to clear debts and keep everyone on the same page.' },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', flex: 1 }}>
      {/* Hero */}
      <section style={{
        textAlign: 'center',
        padding: 'clamp(40px, 8vw, 80px) 20px clamp(32px, 6vw, 60px)',
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(99,102,241,0.12)',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: '999px',
          padding: '6px 16px',
          marginBottom: '24px',
          fontSize: '0.8rem',
          color: '#a5b4fc',
          fontWeight: 500,
        }}>
          <span>✨</span> Split smarter, settle faster
        </div>

        <h1 style={{
          fontSize: 'clamp(2rem, 7vw, 3.8rem)',
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: '-0.04em',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Split expenses<br />
          <span style={{
            background: 'linear-gradient(135deg, #818cf8, #6366f1, #4f52e0)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>with zero drama</span>
        </h1>

        <p style={{
          fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)',
          color: 'var(--text-secondary)',
          maxWidth: '520px',
          margin: '0 auto 32px',
          lineHeight: 1.7,
          padding: '0 8px',
        }}>
          Create groups, track shared expenses, and settle up with friends — all in one beautiful place.
        </p>

        {user ? (
          <Link to="/groups" className="btn-primary" style={{
            textDecoration: 'none', display: 'inline-block',
            padding: '14px 32px', fontSize: '1rem', borderRadius: '12px',
          }}>
            Go to My Groups →
          </Link>
        ) : (
          <div style={{
            display: 'flex', gap: '12px', justifyContent: 'center',
            flexWrap: 'wrap', padding: '0 16px',
          }}>
            <Link to="/register" className="btn-primary" style={{
              textDecoration: 'none', display: 'inline-block',
              padding: '13px 28px', fontSize: '1rem', borderRadius: '12px',
            }}>
              Get Started Free →
            </Link>
            <Link to="/login" style={{
              textDecoration: 'none', display: 'inline-block',
              padding: '13px 28px', fontSize: '1rem', borderRadius: '12px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'var(--text-primary)', fontWeight: 600,
            }}>
              Sign In
            </Link>
          </div>
        )}
      </section>

      {/* Feature Cards */}
      <section style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '0 20px clamp(40px, 8vw, 80px)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px',
      }}>
        {features.map((f) => (
          <div key={f.title} className="glass-card" style={{ padding: 'clamp(16px, 4vw, 24px)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>{f.icon}</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
              {f.title}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
