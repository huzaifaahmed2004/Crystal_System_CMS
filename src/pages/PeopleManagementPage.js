import React, { useEffect, useMemo, useState } from 'react';
import '../styles/job-management.css';
import '../styles/role-management.css';
import { getPeople, deletePerson } from '../services/peopleService';
import { useAppContext } from '../context/AppContext';
import ConfirmModal from '../components/ui/ConfirmModal';

const PeopleManagementPage = () => {
  const { setActiveSection } = useAppContext();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await getPeople();
        const arr = Array.isArray(res) ? res : [];
        setList(arr);
      } catch (e) {
        setError(e?.message || 'Failed to load people');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDelete = async (id) => {
    if (id == null) return;
    try {
      setDeletingId(id);
      setConfirmBusy(true);
      setError('');
      await deletePerson(id);
      setList(prev => Array.isArray(prev) ? prev.filter(p => p.people_id !== id) : prev);
      setConfirmId(null);
    } catch (e) {
      setError(e?.message || 'Failed to delete person');
    } finally {
      setDeletingId(null);
      setConfirmBusy(false);
    }
  };

  const fullName = (p) => [p?.people_name, p?.people_surname].filter(Boolean).join(' ') || '-';

  const filtered = useMemo(() => {
    const term = String(searchTerm || '').trim().toLowerCase();
    if (!term) return list;
    return list.filter(p => {
      const name = String(p?.people_name || '').toLowerCase();
      const surname = String(p?.people_surname || '').toLowerCase();
      const email = String(p?.people_email || '').toLowerCase();
      const phone = String(p?.people_phone || '').toLowerCase();
      const full = `${name} ${surname}`.trim();
      return (
        name.includes(term) ||
        surname.includes(term) ||
        full.includes(term) ||
        email.includes(term) ||
        phone.includes(term)
      );
    });
  }, [list, searchTerm]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">People</h2>
            <p className="page-subtitle">Browse people. Use actions to manage.</p>
          </div>
          <div className="roles-toolbar">
            <div className="roles-search">
              <input
                className="search-input"
                type="text"
                placeholder="Search by name, email, phone"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') {/* client filter only */} }}
              />
              <button className="secondary-btn sm" onClick={() => setSearchTerm('')} disabled={loading}>Clear</button>
            </div>
            <button className="primary-btn" onClick={() => setActiveSection('people-create')}>+ Add Person</button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="no-results">Loading people...</div>
        ) : (
          <div className="roles-table">
            <div className="roles-table-header" style={{ gridTemplateColumns: '1.5fr 0.9fr 1.6fr 1.2fr 1.2fr 180px' }}>
              <div className="cell">Full Name</div>
              <div className="cell">Is Manager</div>
              <div className="cell">Email</div>
              <div className="cell">Created At</div>
              <div className="cell">Updated At</div>
              <div className="cell actions" style={{ textAlign: 'right' }}>Actions</div>
            </div>

            {(!filtered || filtered.length === 0) ? (
              <div className="no-results">No people found</div>
            ) : (
              filtered.map(p => (
                <div key={p.people_id} className="roles-table-row" style={{ gridTemplateColumns: '1.5fr 0.9fr 1.6fr 1.2fr 1.2fr 180px' }}>
                  <div className="cell">{fullName(p)}</div>
                  <div className="cell">{p?.is_manager ? 'Yes' : 'No'}</div>
                  <div className="cell">{p?.people_email || '-'}</div>
                  <div className="cell">{p?.created_at ? new Date(p.created_at).toLocaleString() : '-'}</div>
                  <div className="cell">{p?.updated_at ? new Date(p.updated_at).toLocaleString() : '-'}</div>
                  <div className="cell actions" style={{ textAlign: 'right' }}>
                    <button
                      className="secondary-btn sm"
                      style={{ marginRight: 6 }}
                      onClick={() => { try { localStorage.setItem('activePersonId', String(p.people_id)); } catch {}; setActiveSection('people-view'); }}
                    >
                      View
                    </button>
                    <button
                      className="secondary-btn sm"
                      style={{ marginRight: 6 }}
                      onClick={() => { try { localStorage.setItem('activePersonId', String(p.people_id)); } catch {}; setActiveSection('people-edit'); }}
                    >
                      Edit
                    </button>
                    <button
                      className="danger-btn sm"
                      disabled={deletingId === p.people_id}
                      onClick={() => setConfirmId(p.people_id)}
                    >
                      {deletingId === p.people_id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <ConfirmModal
        open={confirmId != null}
        title="Delete person"
        message="Are you sure you want to delete this person? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => handleDelete(confirmId)}
        onCancel={() => { if (!confirmBusy) setConfirmId(null); }}
        busy={confirmBusy}
      />
    </div>
  );
};

export default PeopleManagementPage;
