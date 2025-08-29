import React, { useEffect, useMemo, useState } from 'react';
import '../styles/role-management.css';
import { getFunctions } from '../services/functionService';
import { useAppContext } from '../context/AppContext';

const FunctionManagementPage = () => {
  const { setActiveSection, setFunctionId, setFunctionFormMode } = useAppContext();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(f =>
      String(f.name || '').toLowerCase().includes(q) ||
      String(f.function_code || '').toLowerCase().includes(q) ||
      String(f.company_name || '').toLowerCase().includes(q) ||
      String(f.parent_name || '').toLowerCase().includes(q) ||
      String(f.parent_code || '').toLowerCase().includes(q)
    );
  }, [list, search]);

  const goView = (id) => {
    setFunctionId(id);
    setFunctionFormMode('view');
    setActiveSection('function-detail');
  };
  const goEdit = (id) => {
    setFunctionId(id);
    setFunctionFormMode('edit');
    setActiveSection('function-edit');
  };
  const goCreate = () => {
    setFunctionId(null);
    setFunctionFormMode('create');
    setActiveSection('function-create');
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
                  <div className="cell">{f.function_code || '-'}</div>
                  <div className="cell">{f.company_name || '-'}</div>
                  <div className="cell">{f.parent_name || '-'}</div>
                  <div className="cell">{f.parent_code || '-'}</div>
                  <div className="cell actions" style={{ textAlign: 'right' }}>
                    <button className="secondary-btn sm" onClick={() => goView(f.function_id)} style={{ marginRight: 6 }}>View</button>
                    <button className="secondary-btn sm" onClick={() => goEdit(f.function_id)}>Edit</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FunctionManagementPage;
