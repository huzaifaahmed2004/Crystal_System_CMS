import React, { useEffect, useMemo, useState } from 'react';
import '../styles/role-management.css';
import { getRoles, getRoleById, createRole, patchRole, deleteRole, deleteRolesBulk } from '../services/roleService';

const emptyForm = { name: '', description: '' };

const RoleManagementPage = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [searchId, setSearchId] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getRoles();
        setRoles(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e?.message || 'Failed to load roles');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const allSelected = useMemo(() => roles.length > 0 && selectedIds.size === roles.length, [roles, selectedIds]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(roles.map(r => r.role_id)));
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const startEdit = (role) => {
    setEditingId(role.role_id);
    setEditForm({ name: role.name || '', description: role.description || '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const saveEdit = async (idOverride) => {
    const rawId = (idOverride !== undefined && idOverride !== null) ? idOverride : editingId;
    alert(`saveEdit start: rawId=${rawId}, name=${editForm?.name || ''}`);
    // Allow 0 as valid id; only guard null/undefined
    if (rawId === null || rawId === undefined) { alert('No editingId set'); return; }
    const idNum = Number(rawId);
    if (!Number.isInteger(idNum)) { alert(`Invalid role id: ${rawId}`); setError('Invalid role id'); return; }
    try {
      const payload = { name: editForm.name.trim(), description: editForm.description.trim() };
      if (!payload.name) { alert('Name is required'); return; }
      // Debug: confirm Save triggers
      console.log('Saving role via PATCH', { rawId, idNum, payload });
      const updated = await patchRole(idNum, payload);
      const merged = (updated && typeof updated === 'object') ? updated : payload; // handle 204/empty
      setRoles((prev) => prev.map(r => (Number(r.role_id) === idNum ? { ...r, ...merged } : r)));
      cancelEdit();
    } catch (e) {
      setError(e?.message || 'Failed to update role');
    }
  };

  const removeSingle = async (id) => {
    try {
      await deleteRole(id);
      setRoles((prev) => prev.filter(r => r.role_id !== id));
      setSelectedIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    } catch (e) {
      setError(e?.message || 'Failed to delete role');
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      await deleteRolesBulk(ids);
      setRoles((prev) => prev.filter(r => !selectedIds.has(r.role_id)));
      setSelectedIds(new Set());
    } catch (e) {
      setError(e?.message || 'Failed to delete selected roles');
    }
  };

  const toggleCreate = () => {
    setCreating((v) => !v);
    setCreateForm(emptyForm);
  };

  const submitCreate = async (e) => {
    e?.preventDefault?.();
    const payload = { name: createForm.name.trim(), description: createForm.description.trim() };
    if (!payload.name) return;
    try {
      const created = await createRole(payload);
      const normalized = created?.role_id ? created : (created?.id ? { ...created, role_id: created.id } : created);
      setRoles((prev) => [normalized, ...prev]);
      toggleCreate();
    } catch (e) {
      setError(e?.message || 'Failed to create role');
    }
  };

  const reloadAll = async () => {
    try {
      setLoading(true);
      const data = await getRoles();
      setRoles(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    const id = String(searchId).trim();
    if (!id) {
      await reloadAll();
      return;
    }
    try {
      setLoading(true);
      const item = await getRoleById(id);
      // If backend returns 404, this will go to catch
      setRoles(item ? [item] : []);
      setError(null);
    } catch (e) {
      setRoles([]);
      setError(e?.message || 'No role found for the provided ID');
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = async () => {
    setSearchId('');
    await reloadAll();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Role Management</h2>
            <p className="page-subtitle">View, create, edit, and delete roles</p>
          </div>
          <div className="roles-toolbar">
            <div className="roles-search">
              <input
                className="search-input"
                type="text"
                inputMode="numeric"
                placeholder="Search by Role ID"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              />
              <button className="primary-btn sm" onClick={handleSearch} disabled={loading}>Search</button>
              <button className="secondary-btn sm" onClick={clearSearch} disabled={loading}>Clear</button>
            </div>
            <button className="primary-btn" onClick={toggleCreate}>+ Create Role</button>
            <button className="danger-btn" onClick={bulkDelete} disabled={selectedIds.size === 0}>Delete Selected</button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="no-results">Loading roles...</div>
        ) : (
          <>
            {creating && (
              <form className="role-card create-card" onSubmit={submitCreate}>
                <div className="field">
                  <label>Name</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Role name"
                    required
                  />
                </div>
                <div className="field">
                  <label>Description</label>
                  <input
                    type="text"
                    value={createForm.description}
                    onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Short description"
                  />
                </div>
                <div className="actions">
                  <button type="button" className="secondary-btn" onClick={toggleCreate}>Cancel</button>
                  <button type="submit" className="primary-btn">Create</button>
                </div>
              </form>
            )}

            <div className="roles-table">
              <div className="roles-table-header">
                <div className="cell checkbox">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                </div>
                <div className="cell name">Name</div>
                <div className="cell description">Description</div>
                <div className="cell actions">Actions</div>
              </div>

              {roles.length === 0 ? (
                <div className="no-results">No roles found.</div>
              ) : (
                roles.map((role) => (
                  <div className={`roles-table-row ${selectedIds.has(role.role_id) ? 'selected' : ''}`} key={role.role_id}>
                    <div className="cell checkbox">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(role.role_id)}
                        onChange={() => toggleSelect(role.role_id)}
                      />
                    </div>

                    {editingId === role.role_id ? (
                      <>
                        <div className="cell name">
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit(role.role_id); } }}
                          />
                        </div>
                        <div className="cell description">
                          <input
                            type="text"
                            value={editForm.description}
                            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit(); } }}
                          />
                        </div>
                        <div className="cell actions">
                          <button
                            type="button"
                            className="primary-btn sm"
                            onClick={async (e) => { 
                              try {
                                e.preventDefault(); 
                                e.stopPropagation(); 
                                alert('Save clicked'); 
                                console.log('Save clicked'); 
                                console.log('Pre-save state', { editingId, editForm });
                                await saveEdit(role.role_id); 
                              } catch (err) {
                                console.error('saveEdit click error', err);
                                alert(`saveEdit click error: ${err?.message || err}`);
                              }
                            }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="secondary-btn sm"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); cancelEdit(); }}
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="cell name">{role.name}</div>
                        <div className="cell description">{role.description}</div>
                        <div className="cell actions">
                          <button className="secondary-btn sm" onClick={() => startEdit(role)}>Edit</button>
                          <button className="danger-btn sm" onClick={() => removeSingle(role.role_id)}>Delete</button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RoleManagementPage;
