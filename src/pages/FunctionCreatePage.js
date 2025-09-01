import React, { useEffect, useMemo, useState } from 'react';
import '../styles/role-management.css';
import { useAppContext } from '../context/AppContext';
import { createFunction, getFunctions } from '../services/functionService';
import { getCompaniesLite } from '../services/layoutService';
import RichTextEditor from '../components/ui/RichTextEditor';
import ColorPicker from '../components/ui/ColorPicker';

const FunctionCreatePage = () => {
  const { setActiveSection, setFunctionId } = useAppContext();
  const [form, setForm] = useState({ 
    name: '', 
    function_code: '', 
    background_color: '#A3A3A3',
    company_id: '',
    parent_id: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);
  const [functions, setFunctions] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [cs, fs] = await Promise.all([
          getCompaniesLite(),
          getFunctions(),
        ]);
        setCompanies(Array.isArray(cs) ? cs : []);
        setFunctions(Array.isArray(fs) ? fs : []);
        const firstCompanyId = (cs?.[0]?.company_id || cs?.[0]?.id) ?? '';
        setForm(s => ({ ...s, company_id: firstCompanyId }));
      } catch (e) {
        // leave empty but allow creation; user can still type
      }
    })();
  }, []);

  const cancel = () => setActiveSection('function-management');
  const save = async () => {
    if (!form.name || !form.function_code) { setError('Name and Code are required'); return; }
    try {
      setSaving(true);
      const created = await createFunction(form);
      // After successful creation, go back to Function Management table
      setActiveSection('function-management');
    } catch (e) {
      setError(e?.message || 'Failed to create function');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Create Function</h2>
            <p className="page-subtitle">Create a new function entry</p>
          </div>
          <div className="roles-toolbar">
            <button className="secondary-btn" onClick={cancel}>Cancel</button>
            <button className="primary-btn" onClick={save} disabled={saving}>{saving ? 'Creating...' : 'Create'}</button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="error-banner">{error}</div>}
        <div className="role-card">
          <div className="form-grid">
            <div className="form-group">
              <label>Function Name</label>
              <input value={form.name} onChange={e => setForm(s => ({ ...s, name: e.target.value }))} />
            </div>
            <ColorPicker
              label="Background Color"
              value={form.background_color}
              onChange={(hex) => setForm(s => ({ ...s, background_color: hex }))}
            />
            <div className="form-group">
              <label>Function Code</label>
              <input value={form.function_code} onChange={e => setForm(s => ({ ...s, function_code: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Select Company</label>
              <select value={form.company_id} onChange={e => setForm(s => ({ ...s, company_id: e.target.value }))}>
                {companies.map(c => (
                  <option key={c.company_id || c.id} value={c.company_id || c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Parent Function</label>
              <select value={form.parent_id} onChange={e => setForm(s => ({ ...s, parent_id: e.target.value }))}>
                <option value="">None</option>
                {functions.map(f => (
                  <option key={f.function_id} value={f.function_id}>{f.name} ({f.function_code})</option>
                ))}
              </select>
            </div>
            <RichTextEditor
              label="Function Overview"
              value={form.description}
              onChange={(html) => setForm(s => ({ ...s, description: html }))}
              height={260}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FunctionCreatePage;
