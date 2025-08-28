import React, { useEffect, useMemo, useState } from 'react';
import '../styles/role-management.css';
import { useAppContext } from '../context/AppContext';
import { getCompanies } from '../services/companyService';
import { getBuildingById, patchBuilding } from '../services/buildingService';

const MAX_ROWS = 5;
const MAX_COLS = 10;

const clampInt = (val, min, max) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return min;
  const i = Math.trunc(n);
  return Math.max(min, Math.min(max, i));
};

const BuildingEditPage = () => {
  const { setActiveSection, buildingId } = useAppContext();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);

  const [form, setForm] = useState({
    building_id: '',
    building_code: '',
    name: '',
    company_id: '',
    country: '',
    city: '',
    rows: 0,
    columns: 0,
    stairs_enabled: false,
    stairs_cell: '',
    elevator_enabled: false,
    elevator_cell: '',
  });

  const totalCells = useMemo(() => (Number(form.rows) || 0) * (Number(form.columns) || 0), [form.rows, form.columns]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [companiesData, buildingData] = await Promise.all([
          getCompanies(),
          getBuildingById(buildingId),
        ]);
        if (!mounted) return;
        setCompanies(Array.isArray(companiesData) ? companiesData : []);
        if (!buildingData) {
          setError('Building not found');
          return;
        }
        setForm({
          building_id: buildingData.building_id ?? '',
          building_code: buildingData.building_code ?? '',
          name: buildingData.name ?? '',
          company_id: buildingData.company_id ?? '',
          country: buildingData.country ?? '',
          city: buildingData.city ?? '',
          rows: clampInt(buildingData.rows ?? 0, 0, MAX_ROWS),
          columns: clampInt(buildingData.columns ?? 0, 0, MAX_COLS),
          stairs_enabled: !!(buildingData.stairs_cell),
          stairs_cell: buildingData.stairs_cell ?? '',
          elevator_enabled: !!(buildingData.elevator_cell),
          elevator_cell: buildingData.elevator_cell ?? '',
        });
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load data');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [buildingId]);

  const backToList = () => {
    setActiveSection('buildings');
  };

  const validate = () => {
    const errors = [];
    if (!String(form.name || '').trim()) errors.push('Building name is required');
    const rows = Number(form.rows), cols = Number(form.columns);
    if (!Number.isInteger(rows) || rows < 0 || rows > MAX_ROWS) errors.push(`Rows must be an integer between 0 and ${MAX_ROWS}`);
    if (!Number.isInteger(cols) || cols < 0 || cols > MAX_COLS) errors.push(`Columns must be an integer between 0 and ${MAX_COLS}`);

    const maxCell = rows * cols;
    const checkCell = (value, label) => {
      if (value === '' || value === null || value === undefined) return;
      const n = Number(value);
      if (!Number.isInteger(n) || n < 1 || n > maxCell) errors.push(`${label} must be between 1 and ${maxCell}`);
    };

    if (form.stairs_enabled) checkCell(form.stairs_cell, 'Stairs cell');
    if (form.elevator_enabled) checkCell(form.elevator_cell, 'Elevator cell');
    return errors;
  };

  const handleSave = async () => {
    const errs = validate();
    if (errs.length) { setError(errs[0]); return; }
    const rows = clampInt(form.rows, 0, MAX_ROWS);
    const columns = clampInt(form.columns, 0, MAX_COLS);
    const payload = {
      building_code: String(form.building_code || '').trim(),
      name: String(form.name).trim(),
      company_id: Number(form.company_id),
      country: String(form.country || '').trim(),
      city: String(form.city || '').trim(),
      rows,
      columns,
    };
    const maxCell = rows * columns;
    if (form.stairs_enabled) payload.stairs_cell = Math.min(Math.max(1, Number(form.stairs_cell)), maxCell);
    else payload.stairs_cell = null;
    if (form.elevator_enabled) payload.elevator_cell = Math.min(Math.max(1, Number(form.elevator_cell)), maxCell);
    else payload.elevator_cell = null;

    try {
      setSaving(true);
      await patchBuilding(buildingId, payload);
      backToList();
    } catch (e) {
      setError(e?.message || 'Failed to save building');
    } finally {
      setSaving(false);
    }
  };

  const renderGrid = () => {
    const rows = clampInt(form.rows, 0, MAX_ROWS);
    const cols = clampInt(form.columns, 0, MAX_COLS);
    if (rows === 0 || cols === 0) return null;

    const cells = [];
    let counter = 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const n = counter++;
        const isStairs = form.stairs_enabled && Number(form.stairs_cell) === n;
        const isElevator = form.elevator_enabled && Number(form.elevator_cell) === n;
        cells.push(
          <div key={n} className={`cell ${isStairs ? 'stairs' : ''} ${isElevator ? 'elevator' : ''}`}>
            {n}
          </div>
        );
      }
    }
    return (
      <div className="grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(60px, 1fr))`, gap: 8 }}>
        {cells}
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Edit Building</h2>
            <p className="page-subtitle">Update building details, layout grid, and stairs/elevator cell positions</p>
          </div>
          <div className="roles-toolbar">
            <button className="secondary-btn" onClick={backToList}>Back to Buildings</button>
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
                />
              </div>
              <div className="field">
                <label>Building Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Company</label>
                <select value={form.company_id} onChange={(e) => setForm((f) => ({ ...f, company_id: e.target.value }))}>
                  <option value="">Select a company</option>
                  {companies.map((c) => (
                    <option key={c.company_id} value={c.company_id}>{c.company_id} - {c.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Country</label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>

              <div className="field">
                <label>Rows (max {MAX_ROWS})</label>
                <input
                  type="number"
                  min="0"
                  max={MAX_ROWS}
                  value={form.rows}
                  onChange={(e) => setForm((f) => ({ ...f, rows: clampInt(e.target.value, 0, MAX_ROWS) }))}
                />
              </div>
              <div className="field">
                <label>Columns (max {MAX_COLS})</label>
                <input
                  type="number"
                  min="0"
                  max={MAX_COLS}
                  value={form.columns}
                  onChange={(e) => setForm((f) => ({ ...f, columns: clampInt(e.target.value, 0, MAX_COLS) }))}
                />
              </div>

              <div className="divider" style={{ margin: '16px 0', borderTop: '1px solid #e5e7eb' }} />

              <div className="field">
                <label>Stairs</label>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={form.stairs_enabled}
                      onChange={(e) => setForm((f) => ({ ...f, stairs_enabled: e.target.checked }))}
                    />
                    Enable
                  </label>
                  <input
                    type="number"
                    placeholder="Cell number"
                    min={1}
                    max={Math.max(1, totalCells || 1)}
                    disabled={!form.stairs_enabled || totalCells === 0}
                    value={form.stairs_cell}
                    onChange={(e) => setForm((f) => ({ ...f, stairs_cell: e.target.value }))}
                    style={{ width: 120 }}
                  />
                </div>
              </div>

              <div className="field">
                <label>Elevator</label>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={form.elevator_enabled}
                      onChange={(e) => setForm((f) => ({ ...f, elevator_enabled: e.target.checked }))}
                    />
                    Enable
                  </label>
                  <input
                    type="number"
                    placeholder="Cell number"
                    min={1}
                    max={Math.max(1, totalCells || 1)}
                    disabled={!form.elevator_enabled || totalCells === 0}
                    value={form.elevator_cell}
                    onChange={(e) => setForm((f) => ({ ...f, elevator_cell: e.target.value }))}
                    style={{ width: 120 }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                {renderGrid()}
              </div>

              <div className="actions" style={{ marginTop: 16 }}>
                <button className="primary-btn" onClick={handleSave} disabled={saving}>Save</button>
                <button className="secondary-btn" onClick={backToList} disabled={saving}>Cancel</button>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
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
      `}</style>
    </div>
  );
};

export default BuildingEditPage;
