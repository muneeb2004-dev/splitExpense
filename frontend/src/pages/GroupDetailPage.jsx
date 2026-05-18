import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { groupService, expenseService, settlementService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/format';

const CATEGORIES = ['food', 'transport', 'accommodation', 'entertainment', 'utilities', 'shopping', 'other'];
const CAT_ICONS = {
  food: '🍔', transport: '🚗', accommodation: '🏠',
  entertainment: '🎬', utilities: '⚡', shopping: '🛍️', other: '📦',
};

export default function GroupDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [balances, setBalances] = useState({});
  const [activeTab, setActiveTab] = useState('expenses');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: '', amount: '', category: 'other', date: '', participants: [],
  });
  const [expenseError, setExpenseError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showSettleForm, setShowSettleForm] = useState(false);
  const [settleForm, setSettleForm] = useState({ toUser: '', amount: '' });
  const [settleError, setSettleError] = useState('');

  const fetchAll = async () => {
    try {
      const [gRes, eRes, sRes, bRes] = await Promise.all([
        groupService.getOne(id),
        expenseService.getAll(id),
        settlementService.getAll(id),
        expenseService.getBalances(id),
      ]);
      setGroup(gRes.data);
      setExpenses(eRes.data);
      setSettlements(sRes.data);
      setBalances(bRes.data);
      setExpenseForm((f) => ({
        ...f,
        participants: gRes.data.members.map((m) => ({ user: m._id, share: 0 })),
      }));
    } catch {
      setError('Failed to load group data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [id]);

  const splitEvenly = () => {
    const amt = parseFloat(expenseForm.amount) || 0;
    const count = expenseForm.participants.length;
    const share = count > 0 ? parseFloat((amt / count).toFixed(2)) : 0;
    setExpenseForm((f) => ({ ...f, participants: f.participants.map((p) => ({ ...p, share })) }));
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    setExpenseError('');
    setSubmitting(true);
    try {
      const payload = {
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        category: expenseForm.category,
        date: expenseForm.date || undefined,
        participants: expenseForm.participants
          .filter((p) => p.share > 0)
          .map((p) => ({ user: p.user, share: parseFloat(p.share) })),
      };
      await expenseService.create(id, payload);
      setShowExpenseForm(false);
      toast.success('Expense added!');
      await fetchAll();
    } catch (err) {
      setExpenseError(err.response?.data?.message || 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettle = async (e) => {
    e.preventDefault();
    setSettleError('');
    setSubmitting(true);
    try {
      await settlementService.create(id, { toUser: settleForm.toUser, amount: parseFloat(settleForm.amount) });
      setShowSettleForm(false);
      setSettleForm({ toUser: '', amount: '' });
      toast.success('Settlement recorded!');
      await fetchAll();
    } catch (err) {
      setSettleError(err.response?.data?.message || 'Failed to record settlement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expId, desc) => {
    if (!confirm(`Delete expense "${desc}"?`)) return;
    try {
      await expenseService.delete(id, expId);
      setExpenses(expenses.filter((e) => e._id !== expId));
      const bRes = await expenseService.getBalances(id);
      setBalances(bRes.data);
      toast.success('Expense deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete expense');
    }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  if (error) return (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      <div className="alert-error" style={{ display: 'inline-block' }}>{error}</div>
    </div>
  );

  const otherMembers = group.members.filter((m) => m._id !== user._id);
  const myBalance = balances[user._id] || 0;

  return (
    <div className="page-container">
      {/* Back */}
      <button onClick={() => navigate('/groups')} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-muted)', fontSize: '0.85rem',
        display: 'flex', alignItems: 'center', gap: '6px',
        marginBottom: '20px', padding: 0, transition: 'color 0.2s',
      }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#a5b4fc'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        ← Back to Groups
      </button>

      {/* Group Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontSize: 'clamp(1.4rem, 5vw, 2rem)', fontWeight: 800,
          letterSpacing: '-0.04em', marginBottom: '6px',
        }}>{group.name}</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', wordBreak: 'break-word' }}>
          {group.members.length} members: {group.members.map((m) => m.name).join(', ')}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="glass-card" style={{
          padding: 'clamp(14px, 3vw, 20px)',
          borderColor: myBalance > 0 ? 'rgba(16,185,129,0.3)' : myBalance < 0 ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)',
        }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Your Balance
          </p>
          <p style={{
            fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', fontWeight: 800, letterSpacing: '-0.03em',
            color: myBalance > 0 ? '#34d399' : myBalance < 0 ? '#f87171' : 'var(--text-secondary)',
          }}>
            {myBalance > 0 ? '+' : ''}{formatCurrency(myBalance)}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            {myBalance > 0 ? 'You are owed' : myBalance < 0 ? 'You owe' : 'All settled up'}
          </p>
        </div>

        <div className="glass-card" style={{ padding: 'clamp(14px, 3vw, 20px)' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Expenses
          </p>
          <p style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
            {formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0))}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Balance Breakdown */}
      <div className="glass-card" style={{ padding: 'clamp(14px, 3vw, 20px)', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Balance Breakdown
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {group.members.map((m) => {
            const bal = balances[m._id] || 0;
            return (
              <div key={m._id} style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${bal > 0 ? 'rgba(16,185,129,0.2)' : bal < 0 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: '10px', padding: '10px 14px', minWidth: '110px',
              }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 500 }}>
                  {m.name}{m._id === user._id && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' }}>(you)</span>}
                </p>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: bal > 0 ? '#34d399' : bal < 0 ? '#f87171' : 'var(--text-muted)' }}>
                  {bal > 0 ? '+' : ''}{formatCurrency(bal)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '6px', marginBottom: '20px',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px', padding: '4px',
      }}>
        {['expenses', 'settlements'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`tab-btn${activeTab === tab ? ' active' : ''}`}
            style={{ flex: 1, textTransform: 'capitalize' }}>
            {tab === 'expenses' ? '💳 Expenses' : '✅ Settlements'}
          </button>
        ))}
      </div>

      {/* EXPENSES TAB */}
      {activeTab === 'expenses' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button onClick={() => setShowExpenseForm(!showExpenseForm)} className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>+</span> Add Expense
            </button>
          </div>

          {showExpenseForm && (
            <div className="glass-card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '20px' }}>💳 New Expense</h2>
              {expenseError && <div className="alert-error" style={{ marginBottom: '14px' }}>{expenseError}</div>}
              <form onSubmit={handleExpenseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-grid-2">
                  <div>
                    <label className="form-label">Description</label>
                    <input type="text" required value={expenseForm.description}
                      onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                      placeholder="e.g. Dinner" className="input-field" />
                  </div>
                  <div>
                    <label className="form-label">Amount ($)</label>
                    <input type="number" required min="0.01" step="0.01" value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      placeholder="0.00" className="input-field" />
                  </div>
                  <div>
                    <label className="form-label">Category</label>
                    <select value={expenseForm.category}
                      onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                      className="input-field">
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{CAT_ICONS[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Date</label>
                    <input type="date" value={expenseForm.date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                      className="input-field" />
                  </div>
                </div>

                {/* Participants */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <label className="form-label" style={{ margin: 0 }}>Shares per member</label>
                    <button type="button" onClick={splitEvenly}
                      style={{ fontSize: '0.8rem', color: '#a5b4fc', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                      Split Evenly
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {expenseForm.participants.map((p, i) => {
                      const member = group.members.find((m) => m._id === p.user);
                      return (
                        <div key={p.user} className="member-share-row" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{
                            fontSize: '0.85rem', color: 'var(--text-secondary)',
                            minWidth: '90px', fontWeight: 500, flexShrink: 0,
                          }}>{member?.name}</span>
                          <input type="number" min="0" step="0.01" value={p.share}
                            onChange={(e) => {
                              const updated = [...expenseForm.participants];
                              updated[i] = { ...updated[i], share: e.target.value };
                              setExpenseForm({ ...expenseForm, participants: updated });
                            }}
                            className="input-field" style={{ flex: 1 }} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', paddingTop: '4px', flexWrap: 'wrap' }}>
                  <button type="submit" disabled={submitting} className="btn-primary">
                    {submitting ? 'Adding…' : 'Add Expense'}
                  </button>
                  <button type="button" onClick={() => setShowExpenseForm(false)} className="btn-ghost">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {expenses.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: 'clamp(28px, 6vw, 50px) 24px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>💳</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No expenses yet. Add your first one!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {expenses.map((exp) => (
                <div key={exp._id} className="glass-card" style={{ padding: 'clamp(12px, 3vw, 16px) clamp(14px, 3vw, 20px)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px', height: '38px', flexShrink: 0,
                      background: 'rgba(255,255,255,0.06)', borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                    }}>
                      {CAT_ICONS[exp.category] || '📦'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {exp.description}
                      </p>
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{exp.paidBy.name}</span>
                        {' · '}<span className={`cat-${exp.category}`}>{exp.category}</span>
                        {' · '}{new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {formatCurrency(exp.amount)}
                      </span>
                      {exp.paidBy._id === user._id && (
                        <button onClick={() => handleDeleteExpense(exp._id, exp.description)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--text-muted)', fontSize: '1rem', padding: '4px',
                            borderRadius: '6px', transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#f87171'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                        >🗑</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* SETTLEMENTS TAB */}
      {activeTab === 'settlements' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button onClick={() => setShowSettleForm(!showSettleForm)} className="btn-success"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>+</span> Record Settlement
            </button>
          </div>

          {showSettleForm && (
            <div className="glass-card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '20px' }}>✅ I paid back…</h2>
              {settleError && <div className="alert-error" style={{ marginBottom: '14px' }}>{settleError}</div>}
              <form onSubmit={handleSettle} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="form-label">To member</label>
                  <select required value={settleForm.toUser}
                    onChange={(e) => setSettleForm({ ...settleForm, toUser: e.target.value })}
                    className="input-field">
                    <option value="">Select member</option>
                    {otherMembers.map((m) => (
                      <option key={m._id} value={m._id}>{m.name} ({m.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Amount ($)</label>
                  <input type="number" required min="0.01" step="0.01" value={settleForm.amount}
                    onChange={(e) => setSettleForm({ ...settleForm, amount: e.target.value })}
                    placeholder="0.00" className="input-field" />
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button type="submit" disabled={submitting} className="btn-success">
                    {submitting ? 'Saving…' : 'Record Payment'}
                  </button>
                  <button type="button" onClick={() => setShowSettleForm(false)} className="btn-ghost">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {settlements.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: 'clamp(28px, 6vw, 50px) 24px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✅</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No settlements recorded yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {settlements.map((s) => (
                <div key={s._id} className="glass-card" style={{
                  padding: 'clamp(12px, 3vw, 16px) clamp(14px, 3vw, 20px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div style={{
                      width: '36px', height: '36px', flexShrink: 0,
                      background: 'rgba(16,185,129,0.1)', borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
                    }}>💸</div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span>{s.fromUser.name}</span>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> paid </span>
                        <span>{s.toUser.name}</span>
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {new Date(s.settledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <span style={{ fontWeight: 800, color: '#34d399', fontSize: '0.95rem', flexShrink: 0 }}>
                    {formatCurrency(s.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
