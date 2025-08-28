import React, { useEffect, useMemo, useState } from 'react';
import '../styles/role-management.css';
import { useAppContext } from '../context/AppContext';
import { getCompanies } from '../services/companyService';
import { getBuildingById, createBuilding, patchBuilding, deleteBuilding } from '../services/buildingService';

const emptyForm = {
  building_id: '',
  name: '',
  company_id: '',
  country: '',
  city: '',
  rows: '',
  columns: '',
  floors: ''
};

const BuildingDetailPage = () => {
  const { setActiveSection, buildingId, setBuildingId, buildingFormMode, setBuildingFormMode } = useAppContext();

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);

  const mode = buildingFormMode || 'view';
  const isCreate = mode === 'create';
  const isEdit = mode === 'edit';
  const isView = mode === 'view';
  const isDelete = mode === 'delete';
  const isReadOnly = isView || isDelete;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [companiesData, buildingData] = await Promise.all([
          getCompanies(),
          isCreate ? Promise.resolve(null) : getBuildingById(buildingId)
        ]);
        if (!mounted) return;
        setCompanies(Array.isArray(companiesData) ? companiesData : []);
        if (isCreate) {
          setForm({ ...emptyForm, floors: 0 });
        } else if (buildingData) {
          setForm({
            building_id: buildingData.building_id ?? '',
            name: buildingData.name ?? '',
            company_id: buildingData.company_id ?? '',
            country: buildingData.country ?? '',
            city: buildingData.city ?? '',
            rows: buildingData.rows ?? '',
            columns: buildingData.columns ?? '',
            floors: buildingData.floors ?? ''
          });
        } else {
          setError('Building not found');
        }
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load data');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [buildingId, isCreate]);

  const title = useMemo(() => {
    if (isCreate) return 'Create Building';
    if (isEdit) return 'Edit Building';
    if (isDelete) return 'Delete Building';
    return 'View Building';
  }, [isCreate, isEdit, isDelete]);

  const backToList = () => {
    setBuildingId(null);
    setBuildingFormMode('view');
    setActiveSection('buildings');
  };

  const validate = () => {
    const errors = [];
    const id = Number(form.building_id);
    if (isCreate && (!Number.isInteger(id) || id <= 0)) errors.push('Building code must be a positive integer');
    if (!String(form.name || '').trim()) errors.push('Building name is required');
    if ((isCreate || isEdit) && (form.company_id === '' || form.company_id === null || Number.isNaN(Number(form.company_id)))) errors.push('Company is required');
    const rows = Number(form.rows), cols = Number(form.columns), floors = Number(form.floors);
    if ((isCreate || isEdit) && (!Number.isInteger(rows) || rows < 0)) errors.push('Rows must be a non-negative integer');
    if ((isCreate || isEdit) && (!Number.isInteger(cols) || cols < 0)) errors.push('Columns must be a non-negative integer');
    if ((isCreate || isEdit) && (!Number.isInteger(floors) || floors < 0)) errors.push('Floors must be a non-negative integer');
    return errors;
  };

  const handleCreate = async () => {
    const errs = validate();
    if (errs.length) { setError(errs[0]); return; }
    try {
      await createBuilding({
        building_id: Number(form.building_id),
        name: String(form.name).trim(),
        company_id: Number(form.company_id),
        country: String(form.country || '').trim(),
        city: String(form.city || '').trim(),
        rows: Number(form.rows) || 0,
        columns: Number(form.columns) || 0,
        floors: Number(form.floors) || 0,
      });
      backToList();
    } catch (e) {
      setError(e?.message || 'Failed to create building');
    }
  };

  const handleSave = async () => {
    const errs = validate();
    if (errs.length) { setError(errs[0]); return; }
    try {
      await patchBuilding(buildingId, {
        building_id: Number(form.building_id),
        name: String(form.name).trim(),
        company_id: Number(form.company_id),
        country: String(form.country || '').trim(),
        city: String(form.city || '').trim(),
        rows: Number(form.rows) || 0,
        columns: Number(form.columns) || 0,
        floors: Number(form.floors) || 0,
      });
      backToList();
    } catch (e) {
      setError(e?.message || 'Failed to save building');
    }
  };

  const handleDelete = async () => {
    const ok = window.confirm('Are you sure you want to delete this building?');
    if (!ok) return;
    try {
      await deleteBuilding(buildingId);
      backToList();
    } catch (e) {
      setError(e?.message || 'Failed to delete building');
    }
  };

  const renderCompanyField = () => {
    if (isView || isDelete) {
      const company = companies.find(c => Number(c.company_id) === Number(form.company_id));
      return (
        <div className="field">
          <label>Company</label>
          <input type="text" value={company ? `${company.company_id} - ${company.name}` : ''} readOnly disabled />
        </div>
      );
    }
    return (
      <div className="field">
        <label>Company</label>
        <select value={form.company_id} onChange={(e) => setForm((f) => ({ ...f, company_id: e.target.value }))}>
          <option value="">Select a company</option>
          {companies.map((c) => (
            <option key={c.company_id} value={c.company_id}>{c.company_id} - {c.name}</option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">{title}</h2>
            <p className="page-subtitle">{isCreate ? 'Create a new building' : isEdit ? 'Edit building details' : isDelete ? 'Confirm deletion of this building' : 'View building details'}</p>
          </div>
          <div className="roles-toolbar">
            <button className="secondary-btn" onClick={backToList}>Back to Buildings</button>
            {isView && (
              <>
                <button className="primary-btn" onClick={() => { setBuildingFormMode('edit'); /* keep id */ }}>Edit</button>
                <button className="danger-btn" onClick={() => { setBuildingFormMode('delete'); /* keep id */ }}>Delete</button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="no-results">Loading...</div>
        ) : (
          <>
            {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}
            <div className="role-card create-card">
              <div className="field">
                <label>Building Code</label>
                <input
                  type="number"
                  min="1"
                  value={form.building_id}
                  onChange={(e) => setForm((f) => ({ ...f, building_id: e.target.value }))}
                  disabled={isReadOnly}
                />
              </div>
              <div className="field">
                <label>Building Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  disabled={isReadOnly}
                />
              </div>
              {renderCompanyField()}
              <div className="field">
                <label>Country</label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  disabled={isReadOnly}
                />
              </div>
              <div className="field">
                <label>City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  disabled={isReadOnly}
                />
              </div>
              <div className="field">
                <label>Rows</label>
                <input
                  type="number"
                  min="0"
                  value={form.rows}
                  onChange={(e) => setForm((f) => ({ ...f, rows: e.target.value }))}
                  disabled={isReadOnly}
                />
              </div>
              <div className="field">
                <label>Columns</label>
                <input
                  type="number"
                  min="0"
                  value={form.columns}
                  onChange={(e) => setForm((f) => ({ ...f, columns: e.target.value }))}
                  disabled={isReadOnly}
                />
              </div>
              <div className="field">
                <label>Floors</label>
                <input
                  type="number"
                  min="0"
                  value={form.floors}
                  readOnly
                  disabled
                />
                <small style={{ color: '#666' }}>Floors are managed separately. Use "Manage Floors" to add/remove floors. Rows/Columns apply to all floors.</small>
              </div>
              <div className="actions">
                {isCreate && (
                  <>
                    <button className="primary-btn" onClick={handleCreate}>Create</button>
                    <button className="secondary-btn" onClick={backToList}>Cancel</button>
                  </>
                )}
                {isEdit && (
                  <>
                    <button className="primary-btn" onClick={handleSave}>Save</button>
                    <button className="secondary-btn" onClick={backToList}>Cancel</button>
                  </>
                )}
                {isDelete && (
                  <>
                    <button className="danger-btn" onClick={handleDelete}>Delete</button>
                    <button className="secondary-btn" onClick={backToList}>Cancel</button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BuildingDetailPage;
