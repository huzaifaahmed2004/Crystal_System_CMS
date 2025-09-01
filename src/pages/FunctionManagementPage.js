import React, { useEffect, useMemo, useState } from 'react';
import '../styles/role-management.css';
import { getFunctions, deleteFunction } from '../services/functionService';
import FormModal from '../components/ui/FormModal';
import { useAppContext } from '../context/AppContext';

const FunctionManagementPage = () => {
  const { setActiveSection, setFunctionId, setFunctionFormMode } = useAppContext();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetId, setTargetId] = useState(null);
  const [targetName, setTargetName] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await getFunctions();
        setList(Array.isArray(res) ? res : []);
      } catch (e) {
        setError(e?.message || 'Failed to load functions');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refresh = async () => {
    try {
      const res = await getFunctions();
      setList(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e?.message || 'Failed to load functions');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(f => {
      const name = String(f.name || '').toLowerCase();
      const code = String(f.function_code || f.functionCode || '').toLowerCase();
      const companyName = String(f.company_name || f.company?.name || '').toLowerCase();
      const parentName = String(f.parent_name || f.parentFunction?.name || '').toLowerCase();
      const parentCode = String(f.parent_code || f.parentFunction?.function_code || f.parentFunction?.functionCode || '').toLowerCase();
      return name.includes(q) || code.includes(q) || companyName.includes(q) || parentName.includes(q) || parentCode.includes(q);
    });
  }, [list, search]);

  const goView = (id) => {
    try { localStorage.setItem('activeFunctionId', String(id)); } catch {}
    setFunctionId(id);
    setFunctionFormMode('view');
    setActiveSection('function-detail');
  };
  const goEdit = (id) => {
    try { localStorage.setItem('activeFunctionId', String(id)); } catch {}
    setFunctionId(id);
    setFunctionFormMode('edit');
    setActiveSection('function-edit');
  };
  const goCreate = () => {
    setFunctionId(null);
    setFunctionFormMode('create');
    setActiveSection('function-create');
    try { localStorage.removeItem('activeFunctionId'); } catch {}
  };

  const requestDelete = (id, name) => {
    setTargetId(id);
    setTargetName(name || 'this function');
    setConfirmOpen(true);
  };

  const onDeleteConfirmed = async () => {
    const id = targetId;
    if (!id) { setConfirmOpen(false); return; }
    try {
      setDeletingId(id);
      setConfirmOpen(false);
      // Optimistic update
      setList(prev => prev.filter(f => f.function_id !== id));
      await deleteFunction(id);
      // Ensure in sync with server
      await refresh();
    } catch (e) {
      setError(e?.message || 'Failed to delete function');
      // fallback: refresh full list to recover
      await refresh();
    } finally {
      setDeletingId(null);
      setTargetId(null);
      setTargetName('');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Function Management</h2>
            <p className="page-subtitle">Browse functions. Use actions to view or edit. Create opens a dedicated page.</p>
          </div>
          <div className="roles-toolbar">
            <div className="roles-search">
              <input
                className="search-input"
                type="text"
                placeholder="Search by name, code, company, parent"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') {/* client filter */} }}
              />
              <button className="secondary-btn sm" onClick={() => setSearch('')}>Clear</button>
            </div>
            <button className="primary-btn" onClick={goCreate}>+ Create Function</button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="no-results">Loading functions...</div>
        ) : (
          <div className="roles-table">
            <div className="roles-table-header" style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1.2fr 1fr 180px' }}>
              <div className="cell">Function Name</div>
              <div className="cell">Function Code</div>
              <div className="cell">Company</div>
              <div className="cell">Parent Name</div>
              <div className="cell">Parent Code</div>
              <div className="cell actions" style={{ textAlign: 'right' }}>Actions</div>
            </div>

            {filtered.length === 0 ? (
              <div className="no-results">No functions found</div>
            ) : (
              filtered.map(f => (
                <div key={f.function_id} className="roles-table-row" style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1.2fr 1fr 180px' }}>
                  <div className="cell">{f.name || '-'}</div>
                  <div className="cell">{f.function_code || f.functionCode || '-'}</div>
                  <div className="cell">{f.company_name || f.company?.name || '-'}</div>
                  <div className="cell">{f.parent_name || f.parentFunction?.name || '-'}</div>
                  <div className="cell">{f.parent_code || f.parentFunction?.function_code || f.parentFunction?.functionCode || '-'}</div>
                  <div className="cell actions" style={{ textAlign: 'right' }}>
                    <button className="secondary-btn sm" onClick={() => goView(f.function_id)} style={{ marginRight: 6 }}>View</button>
                    <button className="secondary-btn sm" onClick={() => goEdit(f.function_id)} style={{ marginRight: 6 }}>Edit</button>
                    <button className="danger-btn sm" disabled={deletingId === f.function_id} onClick={() => requestDelete(f.function_id, f.name)}>
                      {deletingId === f.function_id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        <FormModal
          open={confirmOpen}
          title="Delete Function"
          onCancel={() => { setConfirmOpen(false); setTargetId(null); setTargetName(''); }}
          footer={(
            <>
              <button className="modal-btn" type="button" onClick={() => { setConfirmOpen(false); }}>Cancel</button>
              <button className="danger-btn" type="button" onClick={onDeleteConfirmed} style={{ marginLeft: 8 }}>Delete</button>
            </>
          )}
        >
          <p>Are you sure you want to delete <strong>{targetName || 'this function'}</strong>? This action cannot be undone.</p>
        </FormModal>
      </div>
    </div>
  );
};

export default FunctionManagementPage;
