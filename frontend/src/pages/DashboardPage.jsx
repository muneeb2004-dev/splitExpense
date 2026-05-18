import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { groupService, expenseService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/format';

export default function DashboardPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [allBalances, setAllBalances] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const gRes = await groupService.getAll();
        const groupList = gRes.data;
        setGroups(groupList);
        const balResults = await Promise.allSettled(
          groupList.map((g) => expenseService.getBalances(g._id))
        );
        const bmap = {};
        balResults.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            const groupId = groupList[idx]._id;
            bmap[groupId] = result.value.data[user._id] || 0;
          }
        });
        setAllBalances(bmap);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const totalOwe = Object.values(allBalances).filter((b) => b < 0).reduce((s, b) => s + b, 0);
  const totalOwed = Object.values(allBalances).filter((b) => b > 0).reduce((s, b) => s + b, 0);
  const netBalance = totalOwed + totalOwe;
  const groupsWithBalance = groups.map((g) => ({ ...g, myBal: allBalances[g._id] ?? null }))
    .filter((g) => g.myBal !== null && g.myBal !== 0);

  return (
    <div className="page-container-wide">
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '6px' }}>
          Dashboard
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Welcome back, <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{user?.name}</span>
        </p>
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="summary-grid">
            {/* Net Balance */}
            <div className="glass-card" style={{
              padding: 'clamp(16px, 3vw, 24px)',
              borderColor: netBalance > 0 ? 'rgba(16,185,129,0.3)' : netBalance < 0 ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)',
              background: netBalance > 0 ? 'rgba(16,185,129,0.06)' : netBalance < 0 ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.04)',
            }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Net Balance
              </p>
              <p style={{
                fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 800, letterSpacing: '-0.04em',
                color: netBalance > 0 ? '#34d399' : netBalance < 0 ? '#f87171' : 'var(--text-secondary)',
              }}>
                {netBalance > 0 ? '+' : ''}{formatCurrency(netBalance)}
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                {netBalance > 0 ? 'Overall, you are owed' : netBalance < 0 ? 'Overall, you owe' : 'All balanced out!'}
              </p>
            </div>

            {/* You Owe */}
            <div className="glass-card" style={{ padding: 'clamp(16px, 3vw, 24px)' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '10px' }}>
                You Owe
              </p>
              <p style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 800, letterSpacing: '-0.04em', color: totalOwe < 0 ? '#f87171' : 'var(--text-secondary)' }}>
                {formatCurrency(Math.abs(totalOwe))}
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                Across {groups.filter((g) => (allBalances[g._id] || 0) < 0).length} group(s)
              </p>
            </div>

            {/* You Are Owed */}
            <div className="glass-card" style={{ padding: 'clamp(16px, 3vw, 24px)' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '10px' }}>
                You Are Owed
              </p>
              <p style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 800, letterSpacing: '-0.04em', color: totalOwed > 0 ? '#34d399' : 'var(--text-secondary)' }}>
                {formatCurrency(totalOwed)}
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                Across {groups.filter((g) => (allBalances[g._id] || 0) > 0).length} group(s)
              </p>
            </div>
          </div>

          {/* Outstanding Balances */}
          {groupsWithBalance.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Outstanding Balances
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {groupsWithBalance.map((g) => (
                  <Link key={g._id} to={`/groups/${g._id}`} style={{ textDecoration: 'none' }}>
                    <div className="glass-card" style={{
                      padding: 'clamp(12px, 3vw, 16px) clamp(14px, 3vw, 20px)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{g.members.length} members</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontWeight: 800, fontSize: '1rem', color: g.myBal > 0 ? '#34d399' : '#f87171' }}>
                          {g.myBal > 0 ? '+' : ''}{formatCurrency(g.myBal)}
                        </p>
                        <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                          {g.myBal > 0 ? 'you are owed' : 'you owe'}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* All Groups Grid */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                All Groups ({groups.length})
              </h2>
              <Link to="/groups" style={{ fontSize: '0.8rem', color: '#a5b4fc', textDecoration: 'none', fontWeight: 500 }}>
                Manage →
              </Link>
            </div>

            {groups.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: 'clamp(28px, 6vw, 40px)',
                background: 'rgba(255,255,255,0.03)',
                border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px',
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>👥</div>
                <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>No groups yet.</p>
                <Link to="/groups" style={{ color: '#a5b4fc', textDecoration: 'none', fontWeight: 500, fontSize: '0.875rem' }}>
                  Create your first group →
                </Link>
              </div>
            ) : (
              <div className="groups-grid">
                {groups.map((g) => {
                  const bal = allBalances[g._id] || 0;
                  return (
                    <Link key={g._id} to={`/groups/${g._id}`} style={{ textDecoration: 'none' }}>
                      <div className="glass-card" style={{ padding: 'clamp(14px, 3vw, 16px)', height: '100%' }}>
                        <div style={{
                          width: '36px', height: '36px',
                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          borderRadius: '10px', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '1rem', fontWeight: 700, marginBottom: '10px',
                        }}>
                          {g.name.charAt(0).toUpperCase()}
                        </div>
                        <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {g.name}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {g.members.length} members
                        </p>
                        {bal !== 0 && (
                          <p style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '8px', color: bal > 0 ? '#34d399' : '#f87171' }}>
                            {bal > 0 ? '+' : ''}{formatCurrency(bal)}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
