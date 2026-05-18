import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { groupService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const avatarColors = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #ef4444, #dc2626)',
  'linear-gradient(135deg, #3b82f6, #2563eb)',
  'linear-gradient(135deg, #ec4899, #db2777)',
];

export default function GroupsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', memberEmails: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    groupService.getAll()
      .then((res) => setGroups(res.data))
      .catch(() => setError('Failed to load groups'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const emails = form.memberEmails
        ? form.memberEmails.split(',').map((e) => e.trim()).filter(Boolean)
        : [];
      const { data } = await groupService.create({ name: form.name, memberEmails: emails });
      setGroups([data, ...groups]);
      setShowCreate(false);
      setForm({ name: '', memberEmails: '' });
      toast.success(`Group "${data.name}" created!`);
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (groupId, groupName, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete group "${groupName}"? This cannot be undone.`)) return;
    setDeletingId(groupId);
    try {
      await groupService.delete(groupId);
      setGroups(groups.filter((g) => g._id !== groupId));
      toast.success(`Group "${groupName}" deleted`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete group');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '4px' }}>
            My Groups
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Manage your shared expense groups
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          <span style={{ fontSize: '1.1rem' }}>+</span> New Group
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="glass-card" style={{ padding: 'clamp(18px, 4vw, 28px)', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
            ✨ Create New Group
          </h2>
          {createError && <div className="alert-error" style={{ marginBottom: '16px' }}>{createError}</div>}
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="form-label">Group Name</label>
              <input type="text" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required placeholder="e.g. Weekend Trip, Roommates" className="input-field" />
            </div>
            <div>
              <label className="form-label">
                Invite Members <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(comma-separated emails)</span>
              </label>
              <input type="text" value={form.memberEmails}
                onChange={(e) => setForm({ ...form, memberEmails: e.target.value })}
                placeholder="alice@example.com, bob@example.com" className="input-field" />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                Leave blank to create a solo group
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', paddingTop: '4px', flexWrap: 'wrap' }}>
              <button type="submit" disabled={creating} className="btn-primary">
                {creating ? 'Creating…' : 'Create Group'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Group List */}
      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : error ? (
        <div className="alert-error" style={{ textAlign: 'center' }}>{error}</div>
      ) : groups.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 'clamp(32px, 8vw, 60px) 24px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px dashed rgba(255,255,255,0.1)',
          borderRadius: '16px',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>👥</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>No groups yet</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Create your first group to start splitting expenses
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {groups.map((g, idx) => {
            const isOwner = g.createdBy._id === user?._id || g.createdBy === user?._id;
            return (
              <Link key={g._id} to={`/groups/${g._id}`} style={{ textDecoration: 'none' }}>
                <div className="glass-card" style={{
                  padding: 'clamp(14px, 3vw, 20px) clamp(16px, 4vw, 24px)',
                  display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer',
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: avatarColors[idx % avatarColors.length],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.2rem', flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}>
                    {g.name.charAt(0).toUpperCase()}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{
                      fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)',
                      marginBottom: '3px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{g.name}</h2>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {g.members.length} member{g.members.length !== 1 ? 's' : ''} ·{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>{g.createdBy.name}</span>
                    </p>
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {isOwner && (
                      <button onClick={(e) => handleDelete(g._id, g.name, e)}
                        disabled={deletingId === g._id} className="btn-danger"
                        style={{ fontSize: '0.75rem', padding: '5px 10px' }}>
                        {deletingId === g._id ? '…' : '🗑'}
                      </button>
                    )}
                    <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>→</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
