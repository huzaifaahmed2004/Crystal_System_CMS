import React, { useEffect, useMemo, useState } from 'react';
import '../styles/role-management.css';
import { useAppContext } from '../context/AppContext';
import { getCompanies } from '../services/companyService';
import { getBuildingWithRelations, patchBuilding } from '../services/buildingService';
import Modal from '../components/ui/Modal';

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
  const [showModal, setShowModal] = useState(false);
  const [modalText, setModalText] = useState('');
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

  // Persist current buildingId (if present)
  useEffect(() => {
    if (buildingId != null) {
      try { localStorage.setItem('lastBuildingId', String(buildingId)); } catch {}
    }
  }, [buildingId]);

  useEffect(() => {
    const storedId = (() => { try { return localStorage.getItem('lastBuildingId'); } catch { return null; } })();
    const effectiveId = buildingId ?? (storedId ? Number(storedId) : null);
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [companiesData, buildingData] = await Promise.all([
          getCompanies(),
          effectiveId != null ? getBuildingWithRelations(effectiveId) : Promise.resolve(null),
        ]);
        if (!mounted) return;
        setCompanies(Array.isArray(companiesData) ? companiesData : []);
        if (!buildingData) {
          setModalText('Building not found');
          setShowModal(true);
          return;
        }
        // Normalize columns first, then compute 1-based cell numbers from cells
        const rows = clampInt(buildingData.rows ?? 0, 0, MAX_ROWS);
        const columns = clampInt(buildingData.columns ?? 0, 0, MAX_COLS);
        const cells = Array.isArray(buildingData.cells) ? buildingData.cells : [];
        const findCellNum = (type) => {
          const entry = cells.find((c) => String(c.type).toUpperCase() === type);
          if (!entry || !columns) return '';
          const r = Number(entry.row);
          const c = Number(entry.column);
          if (!Number.isFinite(r) || !Number.isFinite(c) || r < 1 || c < 1) return '';
          return (r - 1) * columns + c; // 1-based cell index
        };
        const stairsCell = findCellNum('STAIRS');
        const elevatorCell = findCellNum('ELEVATOR');

        setForm({
          building_id: buildingData.building_id ?? '',
          building_code: buildingData.building_code ?? buildingData.buildingCode ?? '',
          name: buildingData.name ?? '',
          company_id: buildingData.company_id ?? '',
          country: buildingData.country ?? '',
          city: buildingData.city ?? '',
          rows,
          columns,
          stairs_enabled: stairsCell !== '',
          stairs_cell: stairsCell,
          elevator_enabled: elevatorCell !== '',
          elevator_cell: elevatorCell,
        });
      } catch (e) {
        if (!mounted) return;
        setModalText(e?.message || 'Failed to load data');
        setShowModal(true);
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
    // At least one of stairs or elevator must be enabled with a valid cell
    const hasStairs = form.stairs_enabled && Number.isInteger(Number(form.stairs_cell)) && Number(form.stairs_cell) >= 1 && Number(form.stairs_cell) <= maxCell;
    const hasElevator = form.elevator_enabled && Number.isInteger(Number(form.elevator_cell)) && Number(form.elevator_cell) >= 1 && Number(form.elevator_cell) <= maxCell;
    if (!hasStairs && !hasElevator) errors.push('Select at least one: stairs or elevator with a valid cell');
    // Stairs and elevator cannot occupy the same cell
    if (hasStairs && hasElevator && Number(form.stairs_cell) === Number(form.elevator_cell)) {
      errors.push('Stairs and elevator cannot be on the same cell');
    }
    return errors;
  };

  const handleSave = async () => {
    const errs = validate();
    if (errs.length) { setModalText(errs[0]); setShowModal(true); return; }
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
    // Build layout array from enabled features
    const maxCell = rows * columns;
    const layout = [];
    const toRowCol = (cell) => {
      const idx = Math.min(Math.max(1, Number(cell)), maxCell);
      const zero = idx - 1;
      return {
        row: Math.floor(zero / (columns || 1)) + 1,
        column: (zero % (columns || 1)) + 1,
      };
    };
    if (form.stairs_enabled && form.stairs_cell !== '' && Number.isFinite(Number(form.stairs_cell))) {
      const { row, column } = toRowCol(form.stairs_cell);
      layout.push({ row, column, type: 'STAIRS' });
    }
    if (form.elevator_enabled && form.elevator_cell !== '' && Number.isFinite(Number(form.elevator_cell))) {
      const { row, column } = toRowCol(form.elevator_cell);
      layout.push({ row, column, type: 'ELEVATOR' });
    }
    if (layout.length > 0) payload.layout = layout;

    try {
      setSaving(true);
      const storedId = (() => { try { return localStorage.getItem('lastBuildingId'); } catch { return null; } })();
      const effectiveId = buildingId ?? (storedId ? Number(storedId) : null);
      await patchBuilding(effectiveId, payload);
      backToList();
    } catch (e) {
      setModalText(e?.message || 'Failed to save building');
      setShowModal(true);
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
            {/* Error display via Modal below */}
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
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '') { setForm((f) => ({ ...f, stairs_cell: '' })); return; }
                      const clamped = clampInt(v, 1, Math.max(1, totalCells || 1));
                      setForm((f) => ({ ...f, stairs_cell: clamped }));
                    }}
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
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '') { setForm((f) => ({ ...f, elevator_cell: '' })); return; }
                      const clamped = clampInt(v, 1, Math.max(1, totalCells || 1));
                      setForm((f) => ({ ...f, elevator_cell: clamped }));
                    }}
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
      <Modal
        open={showModal}
        title="Validation Error"
        onCancel={() => setShowModal(false)}
        cancelText="Close"
      >
        <div style={{ color: '#7f1d1d' }}>{modalText}</div>
      </Modal>
    </div>
  );
};

export default BuildingEditPage;
