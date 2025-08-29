import React, { useEffect, useMemo, useState } from 'react';
import '../styles/role-management.css';
import Modal from '../components/ui/Modal';
import FormModal from '../components/ui/FormModal';
import { getCompanies, getCompanyById, createCompany, patchCompany, deleteCompany, deleteCompaniesBulk } from '../services/companyService';
import { getUsers } from '../services/userService';

const emptyForm = { companyCode: '', name: '' };

const CompanyManagementPage = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ companyCode: '', name: '' });
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [createError, setCreateError] = useState('');
  const [searchId, setSearchId] = useState('');
  const [modal, setModal] = useState({ open: false, title: 'Notice', message: '' });

  const openModal = (title, message) => setModal({ open: true, title, message });
  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [companiesData, usersData] = await Promise.all([
          getCompanies(),
          getUsers().catch(() => [])
        ]);
        setCompanies(Array.isArray(companiesData) ? companiesData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
      } catch (e) {
        setError(e?.message || 'Failed to load companies');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const userNameById = useMemo(() => {
    const m = new Map();
    users.forEach(u => m.set(Number(u.user_id), u.name || u.email || `User #${u.user_id}`));
    return m;
  }, [users]);

  const splitDateTime = (iso) => {
    if (!iso) return { date: '—', time: '' };
    try {
      const d = new Date(iso);
      return {
        date: d.toLocaleDateString(),
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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

  const allSelected = useMemo(() => companies.length > 0 && selectedIds.size === companies.length, [companies, selectedIds]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(companies.map(c => c.company_id)));
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const startEdit = (company) => {
    setEditingId(company.company_id);
    setEditForm({ companyCode: company.companyCode || '', name: company.name || '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const saveEdit = async (idOverride) => {
    const prevId = (idOverride !== undefined && idOverride !== null) ? idOverride : editingId;
    if (prevId === null || prevId === undefined) { openModal('Edit error', 'No company selected for editing'); return; }
    const idNum = Number(prevId);
    if (!Number.isInteger(idNum)) { openModal('Edit error', `Invalid company id: ${prevId}`); setError('Invalid company id'); return; }
    try {
      const payload = { companyCode: String(editForm.companyCode || '').trim(), name: String(editForm.name || '').trim() };
      if (!payload.companyCode) { openModal('Validation', 'Company Code is required'); return; }
      if (!payload.name) { openModal('Validation', 'Company Name is required'); return; }
      const updated = await patchCompany(idNum, payload);
      setCompanies((prev) => prev.map(c => (
        Number(c.company_id) === idNum
          ? { ...c, companyCode: updated.companyCode ?? payload.companyCode, name: updated.name ?? payload.name }
          : c
      )));
      cancelEdit();
    } catch (e) {
      setError(e?.message || 'Failed to update company');
    }
  };

  const removeSingle = async (id) => {
    try {
      await deleteCompany(id);
      setCompanies((prev) => prev.filter(c => c.company_id !== id));
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    } catch (e) {
      setError(e?.message || 'Failed to delete company');
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      await deleteCompaniesBulk(ids);
      setCompanies((prev) => prev.filter(c => !selectedIds.has(c.company_id)));
      setSelectedIds(new Set());
    } catch (e) {
      setError(e?.message || 'Failed to delete selected companies');
    }
  };

  // Creating no longer uses numeric company_id; backend expects companyCode, name, created_by

  const openCreate = () => {
    setCreateForm({ companyCode: '', name: '' });
    setCreateError('');
    setCreating(true);
  };

  const cancelCreate = () => {
    setCreating(false);
    setCreateForm(emptyForm);
    setCreateError('');
  };

  const submitCreate = async (e) => {
    e?.preventDefault?.();
    const companyCode = String(createForm.companyCode || '').trim();
    const name = String(createForm.name || '').trim();
    if (!companyCode) { setCreateError('Company Code is required'); return; }
    if (!name) { setCreateError('Company Name is required'); return; }
    try {
      const created = await createCompany({ companyCode, name, created_by: 1 });
      const normalized = created;
      setCompanies((prev) => [normalized, ...prev]);
      cancelCreate();
    } catch (e) {
      setCreateError(e?.message || 'Failed to create company');
    }
  };

  const reloadAll = async () => {
    try {
      setLoading(true);
      const data = await getCompanies();
      setCompanies(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    const id = String(searchId).trim();
    if (!id) { await reloadAll(); return; }
    try {
      setLoading(true);
      const item = await getCompanyById(id);
      setCompanies(item ? [item] : []);
      setError(null);
    } catch (e) {
      setCompanies([]);
      setError(e?.message || 'No company found for the provided code');
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = async () => { setSearchId(''); await reloadAll(); };

  return (
    <>
    <div className="page-container company-page">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Companies</h2>
            <p className="page-subtitle">View, create, edit, and delete companies</p>
          </div>
          <div className="roles-toolbar">
            <div className="roles-search">
              <input
                className="search-input"
                type="text"
                inputMode="numeric"
                placeholder="Search by Company Code"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              />
              <button className="primary-btn sm" onClick={handleSearch} disabled={loading}>Search</button>
              <button className="secondary-btn sm" onClick={clearSearch} disabled={loading}>Clear</button>
            </div>
            <button className="primary-btn" onClick={openCreate}>+ Create Company</button>
            <button className="danger-btn" onClick={bulkDelete} disabled={selectedIds.size === 0}>Delete Selected</button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="no-results">Loading companies...</div>
        ) : (
          <div className="roles-table">
            <div className="roles-table-header">
              <div className="cell checkbox">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
              </div>
              <div className="cell name">Company Code</div>
              <div className="cell description">Company Name</div>
              <div className="cell created-by">Created by</div>
              <div className="cell created-at">Created at</div>
              <div className="cell updated-at">Updated at</div>
              <div className="cell actions">Actions</div>
            </div>

            {companies.length === 0 ? (
              <div className="no-results">No companies found.</div>
            ) : (
              companies.map((c) => (
                <div className={`roles-table-row ${selectedIds.has(c.company_id) ? 'selected' : ''}`} key={c.company_id}>
                  <div className="cell checkbox">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.company_id)}
                      onChange={() => toggleSelect(c.company_id)}
                    />
                  </div>

                  {editingId === c.company_id ? (
                    <>
                      <div className="cell name">
                        <input
                          type="text"
                          value={editForm.companyCode}
                          onChange={(e) => setEditForm((f) => ({ ...f, companyCode: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit(c.company_id); } }}
                        />
                      </div>
                      <div className="cell description">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit(); } }}
                        />
                      </div>
                      <div className="cell created-by">{userNameById.get(Number(c.created_by)) || (c.created_by ? `User #${c.created_by}` : '—')}</div>
                      <div className="cell created-at">{renderDateTime(c.created_at)}</div>
                      <div className="cell updated-at">{renderDateTime(c.updated_at)}</div>
                      <div className="cell actions">
                        <button type="button" className="primary-btn sm" onClick={() => saveEdit(c.company_id)}>Save</button>
                        <button type="button" className="secondary-btn sm" onClick={cancelEdit}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="cell name">{c.companyCode || '—'}</div>
                      <div className="cell description">{c.name}</div>
                      <div className="cell created-by">{userNameById.get(Number(c.created_by)) || (c.created_by ? `User #${c.created_by}` : '—')}</div>
                      <div className="cell created-at">{renderDateTime(c.created_at)}</div>
                      <div className="cell updated-at">{renderDateTime(c.updated_at)}</div>
                      <div className="cell actions">
                        <button className="secondary-btn sm" onClick={() => startEdit(c)}>Edit</button>
                        <button className="danger-btn sm" onClick={() => removeSingle(c.company_id)}>Delete</button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>

    <FormModal
      open={creating}
      title="Create Company"
      onCancel={cancelCreate}
      footer={(
        <>
          <button type="button" className="primary-btn" onClick={submitCreate}>Create</button>
          <button type="button" className="secondary-btn" onClick={cancelCreate}>Cancel</button>
        </>
      )}
    >
      {createError && (<div className="error-banner" style={{ marginBottom: 12 }}>{createError}</div>)}
      <div className="role-card create-card">
        <div className="field">
          <label>Company Code</label>
          <input
            type="text"
            value={createForm.companyCode}
            onChange={(e) => setCreateForm((f) => ({ ...f, companyCode: e.target.value }))}
            placeholder="e.g., CSP"
            required
          />
        </div>
        <div className="field">
          <label>Company Name</label>
          <input
            type="text"
            value={createForm.name}
            onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Company name"
            required
          />
        </div>
      </div>
    </FormModal>
    <Modal open={modal.open} title={modal.title} onCancel={closeModal} cancelText="Close">
      {modal.message}
    </Modal>
    </>
  );
};

export default CompanyManagementPage;
