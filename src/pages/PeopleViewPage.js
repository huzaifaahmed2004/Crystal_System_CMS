import React, { useEffect, useState } from 'react';
import '../styles/role-management.css';
import '../styles/job-management.css';
import { getPersonById } from '../services/peopleService';
import { getCompaniesLite } from '../services/layoutService';
import { getJobs } from '../services/jobService';
import { useAppContext } from '../context/AppContext';

const emptyForm = {
  name: '',
  surname: '',
  email: '',
  phone: '',
  is_manager: false,
  company_id: '',
  job_id: '',
};

const PeopleViewPage = () => {
  const { setActiveSection } = useAppContext();
  const [form, setForm] = useState(emptyForm);
  const [companies, setCompanies] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [personId, setPersonId] = useState(null);

  useEffect(() => {
    const idStr = (() => { try { return localStorage.getItem('activePersonId'); } catch { return null; } })();
    const id = idStr ? Number(idStr) : null;
    setPersonId(id);
    (async () => {
      try {
        setLoading(true);
        const [comps, jobsRes] = await Promise.all([
          getCompaniesLite().catch(() => []),
          getJobs().catch(() => []),
        ]);
        setCompanies(Array.isArray(comps) ? comps : []);
        setJobs(Array.isArray(jobsRes) ? jobsRes : []);
        if (id) {
          const p = await getPersonById(id);
          setForm({
            name: p?.people_name || '',
            surname: p?.people_surname || '',
            email: p?.people_email || '',
            phone: p?.people_phone || '',
            is_manager: !!p?.is_manager,
            company_id: p?.company_id ?? '',
            job_id: p?.job_id ?? '',
          });
        }
      } catch (e) {
        setError(e?.message || 'Failed to load person');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onClose = () => setActiveSection('people-management');

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div className="header-content">
            <div>
              <h2 className="page-title">View Person</h2>
            </div>
          </div>
        </div>
        <div className="page-content">
          <div className="no-results">Loading person...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">View Person</h2>
            <p className="page-subtitle">Read-only details.</p>
          </div>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="error-banner">{error}</div>}
        <div className="role-card">
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="field">
              <label>First Name</label>
              <input value={form.name} disabled />
            </div>
            <div className="field">
              <label>Surname</label>
              <input value={form.surname} disabled />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} disabled />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={form.phone} disabled />
            </div>
            <div className="field">
              <label>Company</label>
              <select value={form.company_id} disabled>
                <option value="">Select company</option>
                {companies.map(c => (
                  <option key={c.company_id || c.id} value={c.company_id || c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Job</label>
              <select value={form.job_id} disabled>
                <option value="">Select job</option>
                {jobs.map(j => (
                  <option key={j.job_id} value={j.job_id}>{j.name}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Is Manager</label>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 6 }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <input type="radio" name="is_manager_view" value="true" checked={form.is_manager === true} disabled />
                  Yes
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <input type="radio" name="is_manager_view" value="false" checked={form.is_manager === false} disabled />
                  No
                </label>
              </div>
            </div>
          </div>
          <div className="actions" style={{ marginTop: 16 }}>
            <button type="button" className="secondary-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeopleViewPage;
