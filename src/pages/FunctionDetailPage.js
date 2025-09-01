import React, { useEffect, useMemo, useState } from 'react';
import '../styles/role-management.css';
import { useAppContext } from '../context/AppContext';
import { getFunctionById, getFunctions } from '../services/functionService';
import { getCompaniesLite } from '../services/layoutService';
import ColorPicker from '../components/ui/ColorPicker';
import RichTextEditor from '../components/ui/RichTextEditor';

const FunctionDetailPage = () => {
  const { functionId, setFunctionId, setActiveSection, setFunctionFormMode } = useAppContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);
  const [functions, setFunctions] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // Recover function id from localStorage on hard refresh
        let fid = functionId;
        if (!fid) {
          try {
            const stored = localStorage.getItem('activeFunctionId');
            if (stored) {
              fid = stored;
              setFunctionId(stored);
            }
          } catch {}
        }
        const [f, cs, fs] = await Promise.all([
          fid ? getFunctionById(fid) : Promise.resolve(null),
          getCompaniesLite(),
          getFunctions(),
        ]);
        setCompanies(Array.isArray(cs) ? cs : []);
        setFunctions(Array.isArray(fs) ? fs : []);
        setData(f);
      } catch (e) {
        setError(e?.message || 'Failed to load function');
      } finally {
        setLoading(false);
      }
    })();
  }, [functionId]);

  const goBack = () => { try { localStorage.removeItem('activeFunctionId'); } catch {} setActiveSection('function-management'); };
  const goEdit = () => { setFunctionFormMode('edit'); setActiveSection('function-edit'); };

  const companyName = useMemo(() => {
    if (!data) return '-';
    if (data.company_name) return data.company_name;
    const id = data.company_id;
    const c = companies.find(x => (x.company_id || x.id) === id);
    return c?.name || '-';
  }, [companies, data]);

  const parentInfo = useMemo(() => {
    if (!data?.parent_id) return { name: '-', code: '-' };
    const p = functions.find(f => String(f.function_id) === String(data.parent_id));
    return { name: p?.name || '-', code: p?.function_code || '-' };
  }, [functions, data]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Function Details</h2>
            <p className="page-subtitle">Read-only view of a function</p>
          </div>
          <div className="roles-toolbar">
            <button className="secondary-btn" onClick={goBack}>← Back</button>
            <button className="primary-btn" onClick={goEdit}>Edit</button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="no-results">Loading...</div>
        ) : !data ? (
          <div className="no-results">Function not found</div>
        ) : (
          <div className="role-card">
            <div className="form-grid">
              <div className="form-group">
                <label>Function Name</label>
                <input value={data.name || ''} disabled />
              </div>

              <ColorPicker label="Background Color" value={data.background_color || data.backgroundColor || '#A3A3A3'} disabled onChange={() => {}} />

              <div className="form-group">
                <label>Function Code</label>
                <input value={data.function_code || data.functionCode || ''} disabled />
              </div>

              <div className="form-group">
                <label>Select Company</label>
                <select value={data.company_id || data.company?.company_id || ''} disabled>
                  {/* include current as selected; also list known companies for consistency */}
                  {companies.map(c => (
                    <option key={c.company_id || c.id} value={c.company_id || c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Parent Function</label>
                <select value={data.parent_id || data.parent_function_id || data.parentFunction?.function_id || ''} disabled>
                  <option value="">None</option>
                  {functions.map(f => (
                    <option key={f.function_id} value={f.function_id}>{f.name} ({f.function_code || f.functionCode})</option>
                  ))}
                </select>
              </div>

              <RichTextEditor label="Function Overview" value={data.description || data.overview || ''} readOnly height={260} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FunctionDetailPage;
