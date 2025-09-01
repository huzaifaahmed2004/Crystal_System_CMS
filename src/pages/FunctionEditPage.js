import React, { useEffect, useState } from 'react';
import '../styles/role-management.css';
import { useAppContext } from '../context/AppContext';
import { getFunctionById, getFunctions, patchFunction } from '../services/functionService';
import { getCompaniesLite } from '../services/layoutService';
import RichTextEditor from '../components/ui/RichTextEditor';
import ColorPicker from '../components/ui/ColorPicker';

const FunctionEditPage = () => {
  const { functionId, setActiveSection } = useAppContext();
  const [form, setForm] = useState({ 
    name: '', 
    function_code: '', 
    background_color: '#A3A3A3',
    company_id: '',
    parent_id: '',
    description: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);
  const [functions, setFunctions] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [f, cs, fs] = await Promise.all([
          getFunctionById(functionId),
          getCompaniesLite(),
          getFunctions(),
        ]);
        setCompanies(Array.isArray(cs) ? cs : []);
        setFunctions(Array.isArray(fs) ? fs : []);
        setForm({
          name: f?.name || '',
          function_code: f?.function_code || '',
          background_color: f?.background_color || '#A3A3A3',
          company_id: f?.company_id || cs?.[0]?.company_id || cs?.[0]?.id || '',
          parent_id: (f?.parent_id && String(f.parent_id) !== String(functionId)) ? f.parent_id : '',
          description: f?.description || '',
        });
      } catch (e) {
        setError(e?.message || 'Failed to load function');
      } finally {
        setLoading(false);
      }
    })();
  }, [functionId]);

  const goBack = () => setActiveSection('function-management');
  const save = async () => {
    if (!form.name || !form.function_code) { setError('Name and Code are required'); return; }
    try {
      setSaving(true);
      await patchFunction(functionId, form);
      setActiveSection('function-detail');
    } catch (e) {
      setError(e?.message || 'Failed to save function');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Edit Function</h2>
            <p className="page-subtitle">Update function details</p>
          </div>
          <div className="roles-toolbar">
            <button className="secondary-btn" onClick={goBack}>Cancel</button>
            <button className="primary-btn" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="no-results">Loading...</div>
        ) : (
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
                  {functions
                    .filter(f => String(f.function_id) !== String(functionId))
                    .map(f => (
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
        )}
      </div>
    </div>
  );
};

export default FunctionEditPage;
