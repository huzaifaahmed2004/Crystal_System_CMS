import React, { useEffect, useMemo, useState } from 'react';
import '../styles/user-management.css';
import '../styles/role-management.css';
import FormModal from '../components/ui/FormModal';
import { getUsers, createUser, patchUser, deleteUser } from '../services/userService';
import { getRoles } from '../services/roleService';
import { getCompanies } from '../services/companyService';

const emptyCreate = { name: '', email: '', password: '', confirmPassword: '', role_id: '', company_id: '' };

const UserAccessControlPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [createError, setCreateError] = useState('');

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role_id: '', company_id: '' });

  const roleNameById = useMemo(() => {
    const m = new Map();
    roles.forEach(r => m.set(Number(r.role_id), r.name));
    return m;
  }, [roles]);
  const companyNameById = useMemo(() => {
    const m = new Map();
    companies.forEach(c => m.set(Number(c.company_id), c.name));
    return m;
  }, [companies]);

  const reload = async () => {
    try {
      setLoading(true);
      const [u, r, c] = await Promise.all([
        getUsers(),
        getRoles(),
        getCompanies(),
      ]);
      setUsers(Array.isArray(u) ? u : []);
      setRoles(Array.isArray(r) ? r : []);
      setCompanies(Array.isArray(c) ? c : []);
      setError(null);
    } catch (e) {
      setError(e?.message || 'Failed to load users or roles');
    } finally {
      setLoading(false);
    }
  };

  const allSelected = useMemo(() => users.length > 0 && selectedIds.size === users.length, [users, selectedIds]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map(u => u.user_id)));
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const startEdit = (user) => {
    setEditingId(user.user_id);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      role_id: String(user.role_id ?? ''),
      company_id: String(user.company_id ?? ''),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', email: '', role_id: '', company_id: '' });
  };

  const saveEdit = async (idOverride) => {
    const rawId = (idOverride !== undefined && idOverride !== null) ? idOverride : editingId;
    if (rawId === null || rawId === undefined) { setError('No user selected for editing'); return; }
    const idNum = Number(rawId);
    if (!Number.isInteger(idNum)) { setError('Invalid user id'); return; }
    const payload = {
      name: (editForm.name || '').trim(),
      email: (editForm.email || '').trim(),
      role_id: Number(editForm.role_id),
      company_id: editForm.company_id ? Number(editForm.company_id) : null,
    };
    if (!payload.name) { setError('Name is required'); return; }
    if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) { setError('Valid email is required'); return; }
    if (!Number.isInteger(payload.role_id)) { setError('Role is required'); return; }
    if (!Number.isInteger(Number(editForm.company_id))) { setError('Company is required'); return; }
    try {
      const updated = await patchUser(idNum, payload);
      const merged = (updated && typeof updated === 'object') ? updated : payload;
      setUsers((prev) => prev.map(u => (Number(u.user_id) === idNum ? { ...u, ...merged } : u)));
      cancelEdit();
    } catch (e) {
      setError(e?.message || 'Failed to update user');
    }
  };

  const removeSingle = async (id) => {
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter(u => u.user_id !== id));
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    } catch (e) {
      setError(e?.message || 'Failed to delete user');
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      const ids = Array.from(selectedIds);
      // simple sequential delete to keep consistent with available service
      for (const id of ids) { // eslint-disable-line no-restricted-syntax
        // eslint-disable-next-line no-await-in-loop
        await deleteUser(id);
      }
      setUsers((prev) => prev.filter(u => !selectedIds.has(u.user_id)));
      setSelectedIds(new Set());
    } catch (e) {
      setError(e?.message || 'Failed to delete selected users');
    }
  };

  useEffect(() => { reload(); }, []);

  const splitDateTime = (iso) => {
    if (!iso) return { date: '—', time: '' };
    try {
      const d = new Date(iso);
      return {
        date: d.toLocaleDateString(),
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    } catch {
      return { date: '—', time: '' };
    }
  };

  const renderDateTime = (iso) => {
    const { date, time } = splitDateTime(iso);
    return (
      <div className="dt-wrap">
        <div>{date}</div>
        <div className="subtext">{time}</div>
      </div>
    );
  };

  const openCreate = () => {
    setCreateForm({ ...emptyCreate });
    setCreateError('');
    setCreateOpen(true);
  };
  const closeCreate = () => setCreateOpen(false);

  const handleCreate = async () => {
    try {
      setCreateError('');
      const payload = {
        name: (createForm.name || '').trim(),
        email: (createForm.email || '').trim(),
        password: (createForm.password || '').trim(),
        confirmPassword: (createForm.confirmPassword || '').trim(),
        role_id: Number(createForm.role_id),
        company_id: createForm.company_id ? Number(createForm.company_id) : null,
      };
      if (!payload.name) { setCreateError('Name is required'); return; }
      if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) { setCreateError('Valid email is required'); return; }
      if (!payload.password) { setCreateError('Password is required'); return; }
      if (!payload.confirmPassword) { setCreateError('Confirm password is required'); return; }
      if (payload.password !== payload.confirmPassword) { setCreateError('Passwords do not match'); return; }
      if (!Number.isInteger(payload.role_id)) { setCreateError('Role is required'); return; }
      if (!Number.isInteger(Number(createForm.company_id))) { setCreateError('Company is required'); return; }

      await createUser(payload);
      await reload();
      closeCreate();
    } catch (e) {
      setCreateError(e?.message || 'Failed to create user');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">User Management</h2>
            <p className="page-subtitle">View all users and create new ones</p>
          </div>
          <div className="roles-toolbar">
            <button type="button" className="primary-btn" onClick={openCreate}>Create User</button>
            <button type="button" className="danger-btn" onClick={bulkDelete} disabled={selectedIds.size === 0}>Delete Selected</button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="error-banner" role="alert">{error}</div>}
        {loading ? (
          <div className="no-results">Loading users…</div>
        ) : (
          <div className="users-table">
            <div className="users-table-header">
              <div className="cell checkbox">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
              </div>
              <div className="cell">Name</div>
              <div className="cell">Email</div>
              <div className="cell">Role</div>
              <div className="cell">Company</div>
              <div className="cell">Updated at</div>
              <div className="cell">Created at</div>
              <div className="cell actions">Actions</div>
            </div>
            {users.length === 0 ? (
              <div className="no-results">No users found</div>
            ) : (
              users.map(u => (
                <div key={u.user_id} className={`users-table-row ${selectedIds.has(u.user_id) ? 'selected' : ''}`}>
                  <div className="cell checkbox">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(u.user_id)}
                      onChange={() => toggleSelect(u.user_id)}
                    />
                  </div>
                  {editingId === u.user_id ? (
                    <>
                      <div className="cell">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit(u.user_id); } }}
                        />
                      </div>
                      <div className="cell">
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit(u.user_id); } }}
                        />
                      </div>
                      <div className="cell">
                        <select
                          value={editForm.role_id}
                          onChange={(e) => setEditForm((f) => ({ ...f, role_id: e.target.value }))}
                        >
                          <option value="">Select role</option>
                          {roles.map(r => (
                            <option key={r.role_id} value={r.role_id}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="cell">
                        <select
                          value={editForm.company_id}
                          onChange={(e) => setEditForm((f) => ({ ...f, company_id: e.target.value }))}
                        >
                          <option value="">Select company</option>
                          {companies.map(c => (
                            <option key={c.company_id} value={c.company_id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="cell">{renderDateTime(u.updated_at)}</div>
                      <div className="cell">{renderDateTime(u.created_at)}</div>
                      <div className="cell actions">
                        <button
                          type="button"
                          className="primary-btn sm"
                          onClick={() => saveEdit(u.user_id)}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="secondary-btn sm"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="cell">{u.name}</div>
                      <div className="cell">{u.email}</div>
                      <div className="cell">{roleNameById.get(Number(u.role_id)) || '—'}</div>
                      <div className="cell">{companyNameById.get(Number(u.company_id)) || '—'}</div>
                      <div className="cell">{renderDateTime(u.updated_at)}</div>
                      <div className="cell">{renderDateTime(u.created_at)}</div>
                      <div className="cell actions">
                        <button className="secondary-btn sm" onClick={() => startEdit(u)}>Edit</button>
                        <button className="danger-btn sm" onClick={() => removeSingle(u.user_id)}>Delete</button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <FormModal
        open={createOpen}
        title="Create User"
        onCancel={closeCreate}
        footer={(
          <>
            <button type="button" className="primary-btn" onClick={handleCreate}>Create</button>
            <button type="button" className="secondary-btn" onClick={closeCreate}>Cancel</button>
          </>
        )}
      >
        {createError && (
          <div className="error-banner" style={{ marginBottom: 12 }}>{createError}</div>
        )}
        <div className="role-card create-card">
          <div className="field">
            <label htmlFor="cu-name">Name</label>
            <input id="cu-name" type="text" value={createForm.name}
                   onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="cu-email">Email</label>
            <input id="cu-email" type="email" value={createForm.email}
                   onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="cu-password">Password</label>
            <input id="cu-password" type="password" value={createForm.password}
                   onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="cu-confirm">Confirm Password</label>
            <input id="cu-confirm" type="password" value={createForm.confirmPassword}
                   onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="cu-company">Company</label>
            <select id="cu-company" value={createForm.company_id}
                    onChange={(e) => setCreateForm({ ...createForm, company_id: e.target.value })}>
              <option value="">Select company</option>
              {companies.map(c => (
                <option key={c.company_id} value={c.company_id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="cu-role">Role</label>
            <select id="cu-role" value={createForm.role_id}
                    onChange={(e) => setCreateForm({ ...createForm, role_id: e.target.value })}>
              <option value="">Select role</option>
              {roles.map(r => (
                <option key={r.role_id} value={r.role_id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
      </FormModal>
    </div>
  );
};

export default UserAccessControlPage;
