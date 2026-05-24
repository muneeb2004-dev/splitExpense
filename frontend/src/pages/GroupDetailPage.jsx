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

// Compute direct pairwise debts from raw expenses.
// Each participant owes the payer their exact share — no cross-netting across people.
// e.g. if Qasim owes Muneeb 232 and Qasim owes Ishtiaq 288, those stay separate.
const computeDirectDebts = (expenses, settlements, members) => {
  // pairDebt[fromId][toId] = total amount fromId owes toId
  const pairDebt = {};

  const add = (fromId, toId, amount) => {
    if (fromId === toId) return;
    if (!pairDebt[fromId]) pairDebt[fromId] = {};
    pairDebt[fromId][toId] = (pairDebt[fromId][toId] || 0) + amount;
  };

  // Each participant owes the payer their share
  expenses.forEach((exp) => {
    const payerId = exp.paidBy._id;
    exp.participants.forEach((p) => {
      const uid = p.user._id || p.user; // handle populated or raw id
      add(uid, payerId, p.share);
    });
  });

  // Accepted settlements reduce the direct debt between those two people
  settlements
    .filter((s) => s.status === 'accepted')
    .forEach((s) => {
      // fromUser paid toUser → reduce fromUser's debt to toUser
      add(s.toUser._id, s.fromUser._id, s.amount);
    });

  // Net each pair and emit debts
  const debts = [];
  const processed = new Set();

  members.forEach((a) => {
    members.forEach((b) => {
      if (a._id === b._id) return;
      const key = [a._id, b._id].sort().join('|');
      if (processed.has(key)) return;
      processed.add(key);

      const aOwesB = (pairDebt[a._id] || {})[b._id] || 0;
      const bOwesA = (pairDebt[b._id] || {})[a._id] || 0;
      const net = parseFloat((aOwesB - bOwesA).toFixed(2));

      if (net > 0.01) debts.push({ from: a, to: b, amount: net });
      else if (net < -0.01) debts.push({ from: b, to: a, amount: parseFloat((-net).toFixed(2)) });
    });
  });

  return debts;
};

const isEqualSplit = (participants) => {
  if (participants.length <= 1) return true;
  const first = participants[0].share;
  return participants.every((p) => Math.abs(p.share - first) < 0.02);
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

  // Expense form
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', category: 'other', date: '' });
  const [splitType, setSplitType] = useState('equally'); // 'equally' | 'by_amount'
  const [selectedParticipants, setSelectedParticipants] = useState(null); // null = all members
  const [customShares, setCustomShares] = useState({}); // { [userId]: string }
  const [expenseError, setExpenseError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    } catch {
      setError('Failed to load group data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [id]);

  const activeParticipantIds = selectedParticipants ?? (group?.members.map((m) => m._id) ?? []);

  const customSharesTotal = activeParticipantIds.reduce((sum, uid) => {
    return sum + (parseFloat(customShares[uid]) || 0);
  }, 0);

  const remaining = parseFloat(expenseForm.amount || 0) - customSharesTotal;

  const resetExpenseForm = () => {
    setShowExpenseForm(false);
    setExpenseForm({ description: '', amount: '', category: 'other', date: '' });
    setSplitType('equally');
    setSelectedParticipants(null);
    setCustomShares({});
    setExpenseError('');
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    setExpenseError('');

    if (activeParticipantIds.length === 0) {
      setExpenseError('Select at least one participant');
      return;
    }

    if (splitType === 'by_amount') {
      if (Math.abs(remaining) > 0.01) {
        setExpenseError(`Remaining amount must be zero. Currently ${remaining > 0 ? 'under' : 'over'} by ${formatCurrency(Math.abs(remaining))}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const amount = parseFloat(expenseForm.amount);
      let payload = {
        description: expenseForm.description,
        amount,
        category: expenseForm.category,
        date: expenseForm.date || undefined,
      };

      if (splitType === 'by_amount') {
        payload.shares = activeParticipantIds.map((uid) => ({
          userId: uid,
          share: parseFloat(parseFloat(customShares[uid] || 0).toFixed(2)),
        }));
      } else {
        payload.participantIds = activeParticipantIds;
      }

      const { data: newExpense } = await expenseService.create(id, payload);
      setExpenses((prev) => [newExpense, ...prev]);
      resetExpenseForm();
      toast.success('Expense added!');
      const { data: newBalances } = await expenseService.getBalances(id);
      setBalances(newBalances);
    } catch (err) {
      setExpenseError(err.response?.data?.message || 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleIPaid = async (debt) => {
    setSubmitting(true);
    try {
      const { data: newSettlement } = await settlementService.create(id, {
        toUser: debt.to._id,
        amount: debt.amount,
      });
      setSettlements((prev) => [newSettlement, ...prev]);
      toast.success(`Payment request of ${formatCurrency(debt.amount)} sent to ${debt.to.name}. Waiting for confirmation.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send payment request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (settlement) => {
    setSubmitting(true);
    try {
      const { data: updated } = await settlementService.accept(id, settlement._id);
      setSettlements((prev) => prev.map((s) => s._id === updated._id ? updated : s));
      toast.success(`Payment of ${formatCurrency(updated.amount)} from ${updated.fromUser.name} confirmed!`);
      const { data: newBalances } = await expenseService.getBalances(id);
      setBalances(newBalances);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expId, desc) => {
    if (!confirm(`Delete expense "${desc}"?`)) return;
    try {
      await expenseService.delete(id, expId);
      setExpenses(expenses.filter((e) => e._id !== expId));
      const { data: newBalances } = await expenseService.getBalances(id);
      setBalances(newBalances);
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

  const myBalance = balances[user._id] || 0;
  const debts = computeDirectDebts(expenses, settlements, group.members);
  const pendingSettlements = settlements.filter((s) => s.status === 'pending');
  const acceptedSettlements = settlements.filter((s) => s.status === 'accepted');
  const pendingToMe = pendingSettlements.filter((s) => s.toUser._id === user._id);
  const pendingFromMe = pendingSettlements.filter((s) => s.fromUser._id === user._id);
  const myDebtCount = debts.filter((d) => d.from._id === user._id).length;
  const pendingBadge = pendingToMe.length;

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
        <h1 style={{ fontSize: 'clamp(1.4rem, 5vw, 2rem)', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '6px' }}>
          {group.name}
        </h1>
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
        {['expenses', 'settle'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`tab-btn${activeTab === tab ? ' active' : ''}`}
            style={{ flex: 1 }}>
            {tab === 'expenses'
              ? '💳 Expenses'
              : `✅ Settle Up${myDebtCount > 0 ? ` (${myDebtCount})` : ''}${pendingBadge > 0 ? ` · ${pendingBadge} pending` : ''}`}
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
              <form onSubmit={handleExpenseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Row 1: description + amount */}
                <div className="form-grid-2">
                  <div>
                    <label className="form-label">Description</label>
                    <input type="text" required value={expenseForm.description}
                      onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                      placeholder="e.g. Lunch" className="input-field" />
                  </div>
                  <div>
                    <label className="form-label">Amount (₨)</label>
                    <input type="number" required min="1" step="1" value={expenseForm.amount}
                      onChange={(e) => {
                        setExpenseForm({ ...expenseForm, amount: e.target.value });
                        setCustomShares({});
                      }}
                      placeholder="0" className="input-field" />
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

                {/* Split type toggle */}
                <div>
                  <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>How to split</label>
                  <div style={{
                    display: 'inline-flex', background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '3px', gap: '3px',
                  }}>
                    {['equally', 'by_amount'].map((type) => (
                      <button key={type} type="button"
                        onClick={() => { setSplitType(type); setCustomShares({}); }}
                        style={{
                          padding: '6px 18px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600,
                          cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                          background: splitType === type ? 'rgba(99,102,241,0.3)' : 'transparent',
                          color: splitType === type ? '#a5b4fc' : 'var(--text-muted)',
                        }}>
                        {type === 'equally' ? '⚖️ Equally' : '✏️ By Amount'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Split among — participant chips */}
                <div>
                  <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                    Split among
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                      ({activeParticipantIds.length} of {group.members.length} selected)
                    </span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {group.members.map((m) => {
                      const active = selectedParticipants === null || selectedParticipants.includes(m._id);
                      return (
                        <button key={m._id} type="button"
                          onClick={() => {
                            const current = selectedParticipants ?? group.members.map((x) => x._id);
                            const next = active
                              ? current.filter((pid) => pid !== m._id)
                              : [...current, m._id];
                            setSelectedParticipants(next.length === group.members.length ? null : next);
                            setCustomShares({});
                          }}
                          style={{
                            padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
                            cursor: 'pointer', transition: 'all 0.15s',
                            background: active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                            border: active ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.1)',
                            color: active ? '#a5b4fc' : 'var(--text-muted)',
                          }}>
                          {m.name}{m._id === user._id ? ' (you)' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Equally — preview */}
                {splitType === 'equally' && expenseForm.amount && activeParticipantIds.length > 0 && (
                  <div style={{
                    background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: '10px', padding: '10px 14px',
                    fontSize: '0.82rem', color: 'var(--text-secondary)',
                  }}>
                    Each person pays:{' '}
                    <strong style={{ color: '#a5b4fc' }}>
                      {formatCurrency(parseFloat(expenseForm.amount) / activeParticipantIds.length)}
                    </strong>
                    {' '}({activeParticipantIds.length} {activeParticipantIds.length === 1 ? 'person' : 'people'})
                  </div>
                )}

                {splitType === 'equally' && activeParticipantIds.length === 0 && (
                  <div className="alert-error">Select at least one participant</div>
                )}

                {/* By Amount — per-person inputs */}
                {splitType === 'by_amount' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeParticipantIds.length === 0 ? (
                      <div className="alert-error">Select at least one participant</div>
                    ) : (
                      <>
                        {group.members.filter((m) => activeParticipantIds.includes(m._id)).map((m) => (
                          <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{
                              fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)',
                              minWidth: '90px', flexShrink: 0,
                            }}>
                              {m.name}{m._id === user._id ? ' (you)' : ''}
                            </span>
                            <div style={{ position: 'relative', flex: 1 }}>
                              <span style={{
                                position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                                color: 'var(--text-muted)', fontSize: '0.85rem', pointerEvents: 'none',
                              }}>₨</span>
                              <input
                                type="number" min="0" step="1"
                                value={customShares[m._id] ?? ''}
                                onChange={(e) => setCustomShares((prev) => ({ ...prev, [m._id]: e.target.value }))}
                                placeholder="0"
                                className="input-field"
                                style={{ paddingLeft: '28px' }}
                              />
                            </div>
                          </div>
                        ))}

                        {/* Remaining counter */}
                        <div style={{
                          background: Math.abs(remaining) < 0.01
                            ? 'rgba(16,185,129,0.08)' : 'rgba(99,102,241,0.08)',
                          border: `1px solid ${Math.abs(remaining) < 0.01
                            ? 'rgba(16,185,129,0.25)' : 'rgba(99,102,241,0.2)'}`,
                          borderRadius: '10px', padding: '10px 14px',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          fontSize: '0.82rem',
                        }}>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {Math.abs(remaining) < 0.01 ? '✅ Fully allocated' : remaining > 0 ? 'Remaining to allocate' : 'Over-allocated by'}
                          </span>
                          <strong style={{
                            color: Math.abs(remaining) < 0.01 ? '#34d399' : remaining > 0 ? '#a5b4fc' : '#f87171',
                            fontSize: '0.9rem',
                          }}>
                            {Math.abs(remaining) < 0.01 ? formatCurrency(0) : formatCurrency(Math.abs(remaining))}
                          </strong>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', paddingTop: '4px', flexWrap: 'wrap' }}>
                  <button type="submit" disabled={submitting} className="btn-primary">
                    {submitting ? 'Adding…' : 'Add Expense'}
                  </button>
                  <button type="button" onClick={resetExpenseForm} className="btn-ghost">
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
              {expenses.map((exp) => {
                const equalSplit = isEqualSplit(exp.participants);
                return (
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
                          Paid by <span style={{ color: 'var(--text-secondary)' }}>{exp.paidBy.name}</span>
                          {' · '}<span className={`cat-${exp.category}`}>{exp.category}</span>
                          {' · '}{new Date(exp.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                            {formatCurrency(exp.amount)}
                          </p>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {equalSplit
                              ? `÷${exp.participants.length} = ${formatCurrency(exp.amount / exp.participants.length)} each`
                              : `${exp.participants.length} people · custom`}
                          </p>
                        </div>
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
                );
              })}
            </div>
          )}
        </>
      )}

      {/* SETTLE UP TAB */}
      {activeTab === 'settle' && (
        <>
          {/* Who Owes Whom */}
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Who Owes Whom
            </h2>
            {debts.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: 'clamp(20px, 5vw, 32px) 24px',
                background: 'rgba(16,185,129,0.04)',
                border: '1px solid rgba(16,185,129,0.15)', borderRadius: '16px',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎉</div>
                <p style={{ color: '#34d399', fontWeight: 600, fontSize: '0.9rem' }}>All settled up!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {debts.map((debt, i) => {
                  const isMe = debt.from._id === user._id;
                  const alreadyPending = pendingFromMe.some(
                    (s) => s.toUser._id === debt.to._id
                  );
                  return (
                    <div key={i} className="glass-card" style={{
                      padding: 'clamp(12px, 3vw, 16px) clamp(14px, 3vw, 20px)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                      borderColor: isMe ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.08)',
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.9rem', color: isMe ? '#f87171' : 'var(--text-primary)' }}>
                          {isMe ? 'You' : debt.from.name}
                          <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> owe </span>
                          {debt.to.name}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                          {isMe
                            ? alreadyPending
                              ? '⏳ Waiting for confirmation from ' + debt.to.name
                              : "Tap 'I Paid' once you've sent the money"
                            : 'Waiting for them to settle'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: isMe ? '#f87171' : 'var(--text-secondary)' }}>
                          {formatCurrency(debt.amount)}
                        </span>
                        {isMe && !alreadyPending && (
                          <button
                            onClick={() => handleIPaid(debt)}
                            disabled={submitting}
                            className="btn-success"
                            style={{ fontSize: '0.78rem', padding: '6px 14px', whiteSpace: 'nowrap' }}
                          >
                            {submitting ? '…' : 'I Paid'}
                          </button>
                        )}
                        {isMe && alreadyPending && (
                          <span style={{
                            fontSize: '0.75rem', padding: '5px 12px', borderRadius: '8px',
                            background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)',
                            color: '#fbbf24', whiteSpace: 'nowrap',
                          }}>
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Payment Requests (shown to the recipient) */}
          {pendingToMe.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fbbf24', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ⏳ Pending Confirmations ({pendingToMe.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pendingToMe.map((s) => (
                  <div key={s._id} className="glass-card" style={{
                    padding: 'clamp(12px, 3vw, 16px) clamp(14px, 3vw, 20px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                    borderColor: 'rgba(251,191,36,0.25)',
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        <span style={{ color: '#fbbf24' }}>{s.fromUser.name}</span>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> says they paid you </span>
                        <span style={{ color: '#34d399' }}>{formatCurrency(s.amount)}</span>
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                        Confirm once you've received the money
                      </p>
                    </div>
                    <button
                      onClick={() => handleAccept(s)}
                      disabled={submitting}
                      className="btn-success"
                      style={{ fontSize: '0.78rem', padding: '6px 14px', whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      {submitting ? '…' : '✓ Accept'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment History — accepted only */}
          <div>
            <h2 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Payment History
            </h2>
            {acceptedSettlements.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: 'clamp(20px, 5vw, 32px) 24px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px',
              }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No confirmed payments yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {acceptedSettlements.map((s) => (
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
                          <span>{s.fromUser._id === user._id ? 'You' : s.fromUser.name}</span>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> paid </span>
                          <span>{s.toUser._id === user._id ? 'you' : s.toUser.name}</span>
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {new Date(s.acceptedAt || s.settledAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}
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
          </div>
        </>
      )}
    </div>
  );
}
