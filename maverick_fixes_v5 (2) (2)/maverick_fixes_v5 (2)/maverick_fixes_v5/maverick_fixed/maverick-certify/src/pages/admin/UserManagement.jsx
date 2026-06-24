import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../layouts/index.jsx';
import { Card, Badge, Button, PageHeader } from '../../components/index.jsx';
import { getUsers, createUser, deleteUser, toggleUserStatus, currentUserEmail, migrateUsers } from '../../services/api.js';

// ── SVG icons ─────────────────────────────────────────────────────────────────
function EyeIcon({ open }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  );
}

// ── Credentials popover ────────────────────────────────────────────────────────
function CredentialsModal({ name, email, password, onClose }) {
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    // Fixed full-screen backdrop — renders above everything, never clipped by grid/overflow
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="bg-surface-card border border-surface-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-5 slide-in"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-teal-500/20 border border-teal-500/30 rounded-lg flex items-center justify-center text-xs font-bold text-teal-300">
              {(name || '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{name}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Login Credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-surface-muted transition-colors text-base leading-none"
          >
            ✕
          </button>
        </div>

        {/* Credentials */}
        <div className="space-y-3">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Email</p>
            <div className="flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-lg px-3 py-2">
              <p className="text-xs text-teal-300 font-mono flex-1 break-all">{email}</p>
              <button
                onClick={() => navigator.clipboard?.writeText(email)}
                title="Copy email"
                className="text-slate-500 hover:text-teal-400 transition-colors flex-shrink-0 text-[10px]"
              >
                ⧉
              </button>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Password</p>
            <div className="flex items-center gap-2 bg-surface-muted border border-surface-border rounded-lg px-3 py-2">
              <p className="text-xs text-slate-300 font-mono flex-1 tracking-widest select-none">
                {showPass ? password : '•'.repeat(Math.min(password.length, 14))}
              </p>
              <button
                onClick={() => setShowPass(p => !p)}
                title={showPass ? 'Hide password' : 'Show password'}
                className="text-slate-500 hover:text-teal-400 transition-colors flex-shrink-0"
              >
                <EyeIcon open={showPass} />
              </button>
              {showPass && (
                <button
                  onClick={() => navigator.clipboard?.writeText(password)}
                  title="Copy password"
                  className="text-slate-500 hover:text-teal-400 transition-colors flex-shrink-0 text-[10px]"
                >
                  ⧉
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="text-[10px] text-slate-600 text-center mt-4">Click outside or press Esc to close</p>
      </div>
    </div>
  );
}

// ── Delete confirmation dialog ─────────────────────────────────────────────────
function DeleteDialog({ user, onConfirm, onCancel, loading }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}>
      <div className="bg-surface-card border border-surface-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 slide-in"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-500/15 rounded-full flex items-center justify-center flex-shrink-0">
            <TrashIcon />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Delete User</h3>
            <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-sm text-slate-300 mb-5">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-white">{user.fullName}</span>
          {' '}({user.role})?
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>Cancel</Button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Creation modal ─────────────────────────────────────────────────────────────
function CreateUserModal({ role, onSave, onCancel, existingEmails }) {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const roleLabel = role === 'admin' ? 'Admin' : 'Coordinator';

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);

  const update = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setError('');
  };

  const validate = () => {
    if (!form.fullName.trim())      return 'Full name is required.';
    if (!form.email.trim())         return 'Email is required.';
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'Enter a valid email address.';
    if (!form.password)             return 'Password is required.';
    if (form.password.length < 6)   return 'Password must be at least 6 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    if (existingEmails.includes(form.email.trim().toLowerCase()))
      return 'This email is already in use.';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    try {
      await onSave({ fullName: form.fullName.trim(), email: form.email.trim(), password: form.password, role });
    } catch (e) {
      setError(e.message || 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}>
      <div className="bg-surface-card border border-surface-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 slide-in"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
              role === 'admin' ? 'bg-red-500/20 border border-red-500/30' : 'bg-teal-500/20 border border-teal-500/30'
            }`}>
              {roleLabel[0]}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Create New {roleLabel}</h3>
              <p className="text-xs text-slate-500">Role: <span className={role === 'admin' ? 'text-red-400' : 'text-teal-400'}>{roleLabel}</span> (auto-assigned)</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-500 hover:text-white transition-colors text-lg leading-none">✕</button>
        </div>

        {/* Fields */}
        <div className="space-y-3 mb-4">
          <input
            className="input-field w-full"
            placeholder="Full Name"
            value={form.fullName}
            onChange={update('fullName')}
            autoFocus
          />
          <input
            className="input-field w-full"
            placeholder="Email address"
            type="email"
            value={form.email}
            onChange={update('email')}
          />
          <input
            className="input-field w-full"
            placeholder="Password (min 6 characters)"
            type="password"
            value={form.password}
            onChange={update('password')}
          />
          <input
            className="input-field w-full"
            placeholder="Confirm password"
            type="password"
            value={form.confirmPassword}
            onChange={update('confirmPassword')}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
          />
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Creating…' : `Create ${roleLabel}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function UserManagement() {
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [apiError, setApiError]         = useState('');

  // Modal state: null | 'admin' | 'coordinator'
  const [createRole, setCreateRole]     = useState(null);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError]   = useState('');

  // Credentials popover
  const [visibleCredId, setVisibleCredId] = useState(null);

  const loggedInEmail = currentUserEmail();

  // ── Load users from MongoDB ────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    try {
      setApiError('');
      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setApiError(e.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Run migration on first mount to normalize any legacy documents in MongoDB
  // (old localStorage flow stored role as "Coordinator" not "coordinator")
  useEffect(() => {
    migrateUsers().finally(() => loadUsers());
  }, [loadUsers]);

  // Outside-click is handled by the modal backdrop's onMouseDown — no window listener needed

  // ── Create user ────────────────────────────────────────────────────────────
  const handleCreate = async (payload) => {
    const created = await createUser(payload);
    setUsers(prev => [...prev, created]);
    setCreateRole(null);
  };

  // ── Delete user ────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await deleteUser(deleteTarget._id);
      setUsers(prev => prev.filter(u => u._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (e) {
      setDeleteError(e.message || 'Failed to delete user.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Toggle active ──────────────────────────────────────────────────────────
  const handleToggleStatus = async (user) => {
    try {
      const updated = await toggleUserStatus(user._id, !user.isActive);
      setUsers(prev => prev.map(u => u._id === updated._id ? updated : u));
    } catch (e) {
      console.error('Toggle status failed:', e.message);
    }
  };

  const existingEmails = users.map(u => u.email.toLowerCase());

  // ── Derive initials ────────────────────────────────────────────────────────
  const getInitials = (name) =>
    (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <AdminLayout>
      <PageHeader
        title="User Management"
        subtitle="Manage admin and coordinator accounts"
        actions={
          <div className="flex gap-2">
            <Button
              variant="indigo"
              onClick={() => setCreateRole('coordinator')}
            >
              + Add Coordinator
            </Button>
            <Button onClick={() => setCreateRole('admin')}>
              + Add Admin
            </Button>
          </div>
        }
      />

      {/* API error */}
      {apiError && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          {apiError}
        </div>
      )}

      {/* Delete error (shown inside dialog; also shown here if dialog already closed) */}
      {deleteError && !deleteTarget && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          {deleteError}
        </div>
      )}

      <Card>
        {loading ? (
          <div className="p-10 text-center">
            <div className="inline-block w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-slate-500">Loading users…</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">
            No users yet. Use <span className="text-teal-400">+ Add Admin</span> or <span className="text-teal-400">+ Add Coordinator</span> to create one.
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[2fr_2fr_1fr_1fr_130px] gap-4 px-5 py-3 border-b border-surface-border">
              {['User', 'Email', 'Role', 'Status', 'Actions'].map(h => (
                <p key={h} className={`text-xs font-medium text-slate-500 uppercase tracking-wider ${['Role', 'Status'].includes(h) ? 'text-center' : ''}`}>{h}</p>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-surface-border">
              {users.map(user => {
                const isMe = user.email === loggedInEmail;
                return (
                  <div key={user._id}
                    className="grid grid-cols-[2fr_2fr_1fr_1fr_130px] gap-4 items-center px-5 py-4 hover:bg-surface-muted transition-colors">

                    {/* Avatar + name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0 shadow-md ${
                        (user.role || '').toLowerCase() === 'admin'
                          ? 'bg-gradient-to-br from-violet-500 to-pink-500 shadow-violet-500/30'
                          : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/30'
                      }`}>
                        {getInitials(user.fullName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user.fullName}</p>
                        {isMe && <p className="text-[10px] text-teal-400">You</p>}
                      </div>
                    </div>

                    {/* Email */}
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>

                    {/* Role badge — normalise to lowercase to handle any legacy casing */}
                    {(() => {
                      const role = (user.role || '').toLowerCase();
                      return (
                        <div className="flex justify-center">
                          <Badge variant={role === 'admin' ? 'danger' : 'teal'}>
                            {role === 'admin' ? 'Admin' : 'Coordinator'}
                          </Badge>
                        </div>
                      );
                    })()}

                    {/* Status badge */}
                    <div className="flex justify-center">
                      <Badge variant={user.isActive ? 'success' : 'default'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      {/* Credentials eye — opens full-screen modal (never clipped by grid overflow) */}
                      <button
                        title="View credentials"
                        onClick={() => setVisibleCredId(user._id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          visibleCredId === user._id
                            ? 'text-teal-400 bg-teal-500/15'
                            : 'text-slate-500 hover:text-teal-400 hover:bg-teal-500/10'
                        }`}>
                        <EyeIcon open={visibleCredId === user._id} />
                      </button>

                      {/* Enable / Disable */}
                      <button
                        onClick={() => handleToggleStatus(user)}
                        disabled={isMe}
                        title={isMe ? 'Cannot disable your own account' : ((user.isActive) ? 'Disable user' : 'Enable user')}
                        className={`text-xs px-2 py-1 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                          user.isActive
                            ? 'text-amber-400 hover:bg-amber-500/10'
                            : 'text-emerald-400 hover:bg-emerald-500/10'
                        }`}>
                        {user.isActive ? 'Disable' : 'Enable'}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => { setDeleteError(''); setDeleteTarget(user); }}
                        disabled={isMe}
                        title={isMe ? 'Cannot delete your own account' : 'Delete user'}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer count */}
            <div className="px-5 py-3 border-t border-surface-border">
              <p className="text-xs text-slate-500">
                {users.length} user{users.length !== 1 ? 's' : ''} ·{' '}
                {users.filter(u => (u.role||'').toLowerCase() === 'admin').length} admin{users.filter(u => (u.role||'').toLowerCase() === 'admin').length !== 1 ? 's' : ''},{' '}
                {users.filter(u => (u.role||'').toLowerCase() === 'coordinator').length} coordinator{users.filter(u => (u.role||'').toLowerCase() === 'coordinator').length !== 1 ? 's' : ''}
              </p>
            </div>
          </>
        )}
      </Card>

      {/* Create user modal */}
      {createRole && (
        <CreateUserModal
          role={createRole}
          onSave={handleCreate}
          onCancel={() => setCreateRole(null)}
          existingEmails={existingEmails}
        />
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <DeleteDialog
          user={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setDeleteTarget(null); setDeleteError(''); }}
          loading={deleteLoading}
          error={deleteError}
        />
      )}

      {/* Credentials modal — fixed-position, renders above all grid/overflow containers */}
      {visibleCredId && (() => {
        const u = users.find(u => u._id === visibleCredId);
        return u ? (
          <CredentialsModal
            name={u.fullName}
            email={u.email}
            password={u.password}
            onClose={() => setVisibleCredId(null)}
          />
        ) : null;
      })()}
    </AdminLayout>
  );
}