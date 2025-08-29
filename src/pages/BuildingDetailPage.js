import React, { useEffect, useMemo, useState } from 'react';
import '../styles/role-management.css';
import { useAppContext } from '../context/AppContext';
import { getCompanies } from '../services/companyService';
import { getBuildingById, getBuildingWithRelations, createBuilding, patchBuilding, deleteBuilding } from '../services/buildingService';

const emptyForm = {
  building_id: '', // internal numeric id (hidden in UI)
  building_code: '', // shown in UI (string)
  name: '',
  company_id: '',
  country: '',
  city: '',
  rows: '',
  columns: '',
  floors: '',
  stairs_cell: '',
  elevator_cell: ''
};

const BuildingDetailPage = () => {
  const { setActiveSection, buildingId, setBuildingId, buildingFormMode, setBuildingFormMode } = useAppContext();

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);
  const [floors, setFloors] = useState([]);

  const mode = buildingFormMode || 'view';
  const isCreate = mode === 'create';
  const isEdit = mode === 'edit';
  const isView = mode === 'view';
  const isDelete = mode === 'delete';
  const isReadOnly = isView || isDelete;

  // Persist current buildingId (if present)
  useEffect(() => {
    if (buildingId != null) {
      try { localStorage.setItem('lastBuildingId', String(buildingId)); } catch {}
    }
  }, [buildingId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const storedId = (() => { try { return localStorage.getItem('lastBuildingId'); } catch { return null; } })();
        const effectiveId = buildingId ?? (storedId ? Number(storedId) : null);
        const [companiesData, buildingData] = await Promise.all([
          getCompanies(),
          isCreate ? Promise.resolve(null) : (
            isView ? (
              effectiveId != null ? getBuildingWithRelations(effectiveId) : Promise.resolve(null)
            ) : (
              effectiveId != null ? getBuildingById(effectiveId) : Promise.resolve(null)
            )
          )
        ]);
        if (!mounted) return;
        setCompanies(Array.isArray(companiesData) ? companiesData : []);
        if (isCreate) {
          setForm({ ...emptyForm, floors: 0, building_code: '' });
        } else if (buildingData) {
          // For view mode, 'with-relations' returns cells (row/column, type)
          const rowsVal = Number(buildingData.rows ?? 0) || 0;
          const colsVal = Number(buildingData.columns ?? 0) || 0;
          const cells = Array.isArray(buildingData.cells) ? buildingData.cells : [];
          const findCellNum = (type) => {
            const entry = cells.find((c) => String(c.type).toUpperCase() === type);
            if (!entry || !colsVal) return '';
            const r = Number(entry.row), c = Number(entry.column);
            if (!Number.isFinite(r) || !Number.isFinite(c) || r < 1 || c < 1) return '';
            return (r - 1) * colsVal + c; // 1-based cell index
          };
          const stairsCell = isView ? findCellNum('STAIRS') : (buildingData.stairs_cell ?? '');
          const elevatorCell = isView ? findCellNum('ELEVATOR') : (buildingData.elevator_cell ?? '');

          setForm({
            building_id: buildingData.building_id ?? '',
            building_code: buildingData.building_code ?? '',
            name: buildingData.name ?? '',
            company_id: buildingData.company_id ?? '',
            country: buildingData.country ?? '',
            city: buildingData.city ?? '',
            rows: rowsVal,
            columns: colsVal,
            floors: buildingData.floors ?? '',
            stairs_cell: stairsCell,
            elevator_cell: elevatorCell
          });
          // In view mode, capture related floors if provided
          if (isView) {
            setFloors(Array.isArray(buildingData.floors) ? buildingData.floors : []);
          } else {
            setFloors([]);
          }
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
  }, [buildingId, isCreate, isView]);

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
    // building_id is internal numeric and hidden; no validation required for UI-only now
    if (!String(form.name || '').trim()) errors.push('Building name is required');
    if ((isCreate || isEdit) && (form.company_id === '' || form.company_id === null || Number.isNaN(Number(form.company_id)))) errors.push('Company is required');
    const rows = Number(form.rows), cols = Number(form.columns);
    if ((isCreate || isEdit) && (!Number.isInteger(rows) || rows < 0 || rows > 5)) errors.push('Rows must be an integer between 0 and 5');
    if ((isCreate || isEdit) && (!Number.isInteger(cols) || cols < 0 || cols > 10)) errors.push('Columns must be an integer between 0 and 10');
    // Ensure stairs and elevator are not on same cell
    if (isEdit || isCreate) {
      const s = form.stairs_cell;
      const e = form.elevator_cell;
      if (s !== '' && e !== '' && Number(s) === Number(e)) {
        errors.push('Stairs and elevator cannot be on the same cell');
      }
    }
    return errors;
  };

  const handleCreate = async () => {
    const errs = validate();
    if (errs.length) { setError(errs[0]); return; }
    try {
      await createBuilding({
        building_code: String(form.building_code || '').trim(),
        name: String(form.name).trim(),
        company_id: Number(form.company_id),
        country: String(form.country || '').trim(),
        city: String(form.city || '').trim(),
        rows: Number(form.rows) || 0,
        columns: Number(form.columns) || 0,
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
      const rows = Number(form.rows) || 0;
      const columns = Number(form.columns) || 0;
      const layout = [];
      const toRowCol = (idx) => ({
        row: Math.floor(idx / (columns || 1)) + 1,
        column: (idx % (columns || 1)) + 1,
      });
      if (form.stairs_cell !== '' && Number.isFinite(Number(form.stairs_cell))) {
        const { row, column } = toRowCol(Number(form.stairs_cell));
        layout.push({ row, column, type: 'STAIRS' });
      }
      if (form.elevator_cell !== '' && Number.isFinite(Number(form.elevator_cell))) {
        const { row, column } = toRowCol(Number(form.elevator_cell));
        layout.push({ row, column, type: 'ELEVATOR' });
      }

      const storedId = (() => { try { return localStorage.getItem('lastBuildingId'); } catch { return null; } })();
      const effectiveId = buildingId ?? (storedId ? Number(storedId) : null);
      await patchBuilding(effectiveId, {
        building_code: String(form.building_code || '').trim(),
        name: String(form.name).trim(),
        company_id: Number(form.company_id),
        country: String(form.country || '').trim(),
        city: String(form.city || '').trim(),
        rows: rows,
        columns: columns,
        ...(layout.length > 0 ? { layout } : {}),
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
      const storedId = (() => { try { return localStorage.getItem('lastBuildingId'); } catch { return null; } })();
      const effectiveId = buildingId ?? (storedId ? Number(storedId) : null);
      await deleteBuilding(effectiveId);
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
                <button className="primary-btn" onClick={() => { setActiveSection('building-edit'); /* go to dedicated edit page */ }}>Edit</button>
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
                  type="text"
                  value={form.building_code}
                  onChange={(e) => setForm((f) => ({ ...f, building_code: e.target.value }))}
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
                  max="5"
                  value={form.rows}
                  onChange={(e) => {
                    const n = Math.max(0, Math.min(5, Number(e.target.value)));
                    setForm((f) => ({ ...f, rows: Number.isFinite(n) ? n : 0 }));
                  }}
                  disabled={isReadOnly}
                />
              </div>
              <div className="field">
                <label>Columns</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={form.columns}
                  onChange={(e) => {
                    const n = Math.max(0, Math.min(10, Number(e.target.value)));
                    setForm((f) => ({ ...f, columns: Number.isFinite(n) ? n : 0 }));
                  }}
                  disabled={isReadOnly}
                />
              </div>
              {!isCreate && (
                <>
                  <div className="field">
                    <label>Stairs Cell</label>
                    <input
                      type="number"
                      min="0"
                      value={form.stairs_cell}
                      onChange={(e) => {
                        const v = e.target.value;
                        const total = (Number(form.rows) || 0) * (Number(form.columns) || 0);
                        let n = Number(v);
                        if (!Number.isFinite(n) || n < 0) n = 0;
                        if (total > 0) n = Math.min(n, Math.max(0, total - 1));
                        setForm((f) => ({ ...f, stairs_cell: v === '' ? '' : n }));
                      }}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="field">
                    <label>Elevator Cell</label>
                    <input
                      type="number"
                      min="0"
                      value={form.elevator_cell}
                      onChange={(e) => {
                        const v = e.target.value;
                        const total = (Number(form.rows) || 0) * (Number(form.columns) || 0);
                        let n = Number(v);
                        if (!Number.isFinite(n) || n < 0) n = 0;
                        if (total > 0) n = Math.min(n, Math.max(0, total - 1));
                        setForm((f) => ({ ...f, elevator_cell: v === '' ? '' : n }));
                      }}
                      disabled={isReadOnly}
                    />
                  </div>
                  {isView && (
                    // Render read-only grid with highlights for stairs/elevator
                    <div style={{ marginTop: 12 }}>
                      {(Number(form.rows) || 0) > 0 && (Number(form.columns) || 0) > 0 && (
                        <div className="grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${Number(form.columns)}, minmax(60px, 1fr))`, gap: 8 }}>
                          {Array.from({ length: (Number(form.rows) || 0) * (Number(form.columns) || 0) }, (_, i) => {
                            const n = i + 1;
                            const isStairs = Number(form.stairs_cell) === n;
                            const isElevator = Number(form.elevator_cell) === n;
                            return (
                              <div key={n} className={`cell ${isStairs ? 'stairs' : ''} ${isElevator ? 'elevator' : ''}`}>
                                {n}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
              {isView && (
                <div className="field">
                  <label>Floors</label>
                  {floors.length === 0 ? (
                    <div className="no-results" style={{ marginTop: 8 }}>No floors</div>
                  ) : (
                    <div className="roles-table" style={{ marginTop: 8 }}>
                      <div className="roles-table-header" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <div className="cell">Floor Code</div>
                        <div className="cell">Name</div>
                      </div>
                      {floors.map((fl) => (
                        <div className="roles-table-row" key={fl.floor_id} style={{ gridTemplateColumns: '1fr 1fr' }}>
                          <div className="cell">{fl.floor_code || '-'}</div>
                          <div className="cell">{fl.name || '-'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                </div>
              )}
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

// Inline styles for the read-only grid in View mode
// Kept local to this page as requested (no global/style file changes)
// Matches the styling used on the Edit page
// Note: Using a fragment to inject a <style> tag adjacent to export is not valid.
// So we attach this style by rendering it once at module load via document head if available.
if (typeof document !== 'undefined') {
  const STYLE_ID = 'building-detail-view-grid-styles';
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .grid .cell {
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        background: #f8fafc;
        color: #94a3b8;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 60px;
        font-weight: 600;
      }
      .grid .cell.stairs { outline: 2px solid #10b981; color: #0f766e; background: #ecfdf5; }
      .grid .cell.elevator { outline: 2px solid #3b82f6; color: #1d4ed8; background: #eff6ff; }
    `;
    document.head.appendChild(style);
  }
}
