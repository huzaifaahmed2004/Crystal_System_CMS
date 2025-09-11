import React from 'react';
import '../styles/process-management.css';
import { getProcesses, deleteProcess } from '../services/processService';
import { getCompaniesLite } from '../services/layoutService';
import '../styles/role-management.css';
import { useAppContext } from '../context/AppContext';
import ConfirmModal from '../components/ui/ConfirmModal';

const ProcessManagementPage = () => {
  const { setActiveSection } = useAppContext();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [list, setList] = React.useState([]);
  const [companiesMap, setCompaniesMap] = React.useState({});
  const [search, setSearch] = React.useState('');
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [selected, setSelected] = React.useState(null); // process selected for deletion

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError('');
        const [processesRes, companiesRes] = await Promise.all([
          getProcesses(),
          getCompaniesLite().catch(() => []),
        ]);
        setList(Array.isArray(processesRes) ? processesRes : []);
        const cMap = {};
        (companiesRes || []).forEach(c => { cMap[String(c.company_id || c.id)] = c.name; });
        setCompaniesMap(cMap);
      } catch (e) {
        setError(e?.message || 'Failed to load processes');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fmt = (v) => {
    try { const d = new Date(v); return isNaN(d.getTime()) ? '-' : d.toLocaleString(); } catch { return '-'; }
  };

  const filtered = React.useMemo(() => {
    const q = (search || '').toLowerCase().trim();
    if (!q) return list;
    return (list || []).filter(p => {
      const code = String(p.process_code || '').toLowerCase();
      const name = String(p.process_name || '').toLowerCase();
      const comp = String(companiesMap[String(p.company_id)] || '').toLowerCase();
      return code.includes(q) || name.includes(q) || comp.includes(q);
    });
  }, [list, search, companiesMap]);

  const openDelete = (proc) => {
    setSelected(proc);
    setConfirmOpen(true);
  };

  const closeDelete = () => {
    if (deleting) return;
    setConfirmOpen(false);
    setSelected(null);
  };

  const confirmDelete = async () => {
    if (!selected?.process_id) return;
    try {
      setDeleting(true);
      setError('');
      await deleteProcess(selected.process_id);
      // Optimistically remove from list
      setList(prev => prev.filter(x => x.process_id !== selected.process_id));
      setConfirmOpen(false);
      setSelected(null);
    } catch (e) {
      setError(e?.message || 'Failed to delete process');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Processes</h2>
            <p className="page-subtitle">Browse all processes</p>
          </div>
          <div className="roles-toolbar">
            <div className="roles-search">
              <input
                className="search-input"
                type="text"
                placeholder="Search by code, name, company"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { /* client filter only */ } }}
              />
              <button className="secondary-btn sm" onClick={() => setSearch('')}>Clear</button>
            </div>
            <button className="primary-btn" onClick={() => setActiveSection('process-create')}>+ Create Process</button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="no-results">Loading processes...</div>
        ) : (
          <div className="roles-table">
            <div className="roles-table-header" style={{ gridTemplateColumns: '1.2fr 1.8fr 1.4fr 1.2fr 1.2fr 200px' }}>
              <div className="cell">Process Code</div>
              <div className="cell">Process Name</div>
              <div className="cell">Company</div>
              <div className="cell">Created At</div>
              <div className="cell">Updated At</div>
              <div className="cell actions" style={{ textAlign: 'right' }}>Actions</div>
            </div>

            {(!filtered || filtered.length === 0) ? (
              <div className="no-results">No processes found</div>
            ) : (
              filtered.map(p => (
                <div key={p.process_id} className="roles-table-row" style={{ gridTemplateColumns: '1.2fr 1.8fr 1.4fr 1.2fr 1.2fr 200px' }}>
                  <div className="cell">{p.process_code || '-'}</div>
                  <div className="cell">{p.process_name || '-'}</div>
                  <div className="cell">{companiesMap[String(p.company_id)] || '-'}</div>
                  <div className="cell">{fmt(p.created_at)}</div>
                  <div className="cell">{fmt(p.updated_at)}</div>
                  <div className="cell actions" style={{ textAlign: 'right' }}>
                    <button
                      className="secondary-btn sm"
                      style={{ marginRight: 6 }}
                      onClick={() => { try { localStorage.setItem('activeProcessId', String(p.process_id)); } catch {}; setActiveSection('process-view'); }}
                    >
                      View
                    </button>
                    <button
                      className="secondary-btn sm"
                      style={{ marginRight: 6 }}
                      onClick={() => { try { localStorage.setItem('activeProcessId', String(p.process_id)); } catch {}; setActiveSection('process-edit'); }}
                    >
                      Edit
                    </button>
                    <button className="danger-btn sm" onClick={() => openDelete(p)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        <ConfirmModal
          open={confirmOpen}
          title="Delete Process"
          message={(
            <div>
              <p>Are you sure you want to delete this process?</p>
              <ul style={{ marginTop: 8 }}>
                <li><strong>Code:</strong> {selected?.process_code}</li>
                <li><strong>Name:</strong> {selected?.process_name}</li>
                <li><strong>Company:</strong> {companiesMap[String(selected?.company_id)] || '-'}</li>
              </ul>
            </div>
          )}
          confirmLabel={deleting ? 'Deleting...' : 'Delete'}
          cancelLabel="Cancel"
          onConfirm={confirmDelete}
          onCancel={closeDelete}
          busy={deleting}
        />
      </div>
    </div>
  );
};

export default ProcessManagementPage;
