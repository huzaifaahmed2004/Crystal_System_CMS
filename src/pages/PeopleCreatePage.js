import React, { useEffect, useState } from 'react';
import '../styles/role-management.css';
import '../styles/job-management.css';
import { createPerson } from '../services/peopleService';
import { getCompaniesLite } from '../services/layoutService';
import { getJobs } from '../services/jobService';
import { useAppContext } from '../context/AppContext';

const initialForm = {
  name: '',
  surname: '',
  email: '',
  phone: '',
  is_manager: false,
  company_id: '',
  job_id: '',
};

const PeopleCreatePage = () => {
  const { setActiveSection } = useAppContext();
  const [form, setForm] = useState(initialForm);
  const [companies, setCompanies] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [comps, jobsRes] = await Promise.all([
          getCompaniesLite().catch(() => []),
          getJobs().catch(() => []),
        ]);
        setCompanies(Array.isArray(comps) ? comps : []);
        setJobs(Array.isArray(jobsRes) ? jobsRes : []);
      } catch (e) {
        // ignore, page can still render
      }
    })();
  }, []);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'radio' && name === 'is_manager') {
      setForm(prev => ({ ...prev, is_manager: value === 'true' }));
    } else {
      setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const onCancel = () => setActiveSection('people-management');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSaving(true);
      const payload = {
        name: String(form.name || '').trim(),
        surname: String(form.surname || '').trim(),
        email: String(form.email || '').trim(),
        phone: String(form.phone || '').trim(),
        is_manager: !!form.is_manager,
        company_id: form.company_id ? Number(form.company_id) : null,
        job_id: form.job_id ? Number(form.job_id) : null,
      };
      await createPerson(payload);
      setActiveSection('people-management');
    } catch (e) {
      setError(e?.message || 'Failed to create person');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Add Person</h2>
            <p className="page-subtitle">Create a new person.</p>
          </div>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="error-banner">{error}</div>}
        <div className="role-card">
          <form onSubmit={onSubmit}>
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="field">
                <label>First Name</label>
                <input name="name" value={form.name} onChange={onChange} placeholder="John" />
              </div>
              <div className="field">
                <label>Surname</label>
                <input name="surname" value={form.surname} onChange={onChange} placeholder="Doe" />
              </div>
              <div className="field">
                <label>Email</label>
                <input type="email" name="email" value={form.email} onChange={onChange} placeholder="john@example.com" />
              </div>
              <div className="field">
                <label>Phone</label>
                <input name="phone" value={form.phone} onChange={onChange} placeholder="+1234567890" />
              </div>
              <div className="field">
                <label>Company</label>
                <select name="company_id" value={form.company_id} onChange={onChange}>
                  <option value="">Select company</option>
                  {companies.map(c => (
                    <option key={c.company_id || c.id} value={c.company_id || c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Job</label>
                <select name="job_id" value={form.job_id} onChange={onChange}>
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
                    <input type="radio" name="is_manager" value="true" checked={form.is_manager === true} onChange={onChange} />
                    Yes
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <input type="radio" name="is_manager" value="false" checked={form.is_manager === false} onChange={onChange} />
                    No
                  </label>
                </div>
              </div>
            </div>
            <div className="actions" style={{ marginTop: 16 }}>
              <button type="button" className="secondary-btn" onClick={onCancel} disabled={saving}>Cancel</button>
              <button type="submit" className="primary-btn" style={{ marginLeft: 8 }} disabled={saving}>
                {saving ? 'Saving...' : 'Save Person'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PeopleCreatePage;
