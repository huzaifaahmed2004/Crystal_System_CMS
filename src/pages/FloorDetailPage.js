import React, { useEffect, useMemo, useState } from 'react';
import '../styles/role-management.css';
import { useAppContext } from '../context/AppContext';
import { getBuildings } from '../services/buildingService';
import { getFloorById, getFloors, createFloor, patchFloor } from '../services/floorService';
import FormModal from '../components/ui/FormModal';

const FloorDetailPage = () => {
  const { setActiveSection, floorFormMode, floorId, setFloorId } = useAppContext();

  const isCreate = floorFormMode === 'create';
  const isEdit = floorFormMode === 'edit';

  const [buildings, setBuildings] = useState([]);
  const buildingMap = useMemo(() => Object.fromEntries((buildings || []).map(b => [Number(b.building_id), b])), [buildings]);

  const [form, setForm] = useState({ building_id: '', floor_code: '', name: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Rooms section removed for Edit Floor page

  // Local-only DnD state (no API integration): palette and cell assignments
  const [assignments, setAssignments] = useState({}); // key: `${row}-${col}` -> typeId
  const [cellTables, setCellTables] = useState({}); // key -> number of tables dropped
  const [cellJobs, setCellJobs] = useState({}); // key -> array of job strings per table
  const [jobModal, setJobModal] = useState({ open: false, key: null });
  const [jobInputs, setJobInputs] = useState([]); // working copy for modal inputs
  const [cellScale, setCellScale] = useState(1); // zoom for grid cells (fixed now)
  const displayTableTypes = useMemo(() => {
    // 12 icons: 1hor, 1ver, 2hor, 2ver, ..., 6hor, 6ver
    const base = [];
    for (let i = 1; i <= 12; i++) {
      const count = Math.ceil(i / 2);
      const isHor = (i % 2 === 1);
      const labelCount = count === 1 ? 'Single' : `${count}x`;
      const labelOri = isHor ? 'Horizontal' : 'Vertical';
      base.push({ id: i, name: `${labelCount} ${labelOri} Table${count > 1 ? 's' : ''}` });
    }
    return base;
  }, []);

  // Helpers derived from selected building (must be defined before dependent memos)
  const selectedBuilding = useMemo(() => buildingMap[Number(form.building_id)], [buildingMap, form.building_id]);
  const gridRows = Number(selectedBuilding?.rows) || 0;
  const gridCols = Number(selectedBuilding?.columns) || 0;
  const stairsCell = selectedBuilding?.stairs_cell ?? null;
  const elevatorCell = selectedBuilding?.elevator_cell ?? null;

  // Derived lists for read-only display
  const roomNames = useMemo(() => {
    if (!gridRows || !gridCols) return [];
    const bName = selectedBuilding?.name || 'Building';
    const fLabel = form?.name || form?.floor_code || 'Floor';
    const list = [];
    for (let r = 1; r <= gridRows; r++) {
      for (let c = 1; c <= gridCols; c++) {
        list.push(`${bName} • ${fLabel} • ${r}-${c}`);
      }
    }
    return list;
  }, [gridRows, gridCols, selectedBuilding, form]);

  const functionNames = useMemo(() => {
    if (!assignments) return [];
    const items = [];
    for (const [key, typeId] of Object.entries(assignments)) {
      if (!typeId) continue;
      const type = displayTableTypes.find((t) => String(t.id) === String(typeId));
      if (type) items.push(`${type.name} • ${key}`);
    }
    return items.sort();
  }, [assignments, displayTableTypes]);

  const title = useMemo(() => {
    if (isCreate) return 'Create Floor';
    if (isEdit) return 'Edit Floor';
    return 'Floor Details';
  }, [isCreate, isEdit]);

  useEffect(() => {
    setActiveSection('floor-detail');
    (async () => {
      try {
        const [bld, _floors] = await Promise.all([
          getBuildings().catch(() => []),
          getFloors().catch(() => [])
        ]);
        setBuildings(bld);
        // Rooms fetch removed
      } catch (e) {
        setError(e?.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        if (isEdit && floorId != null) {
          try {
            const f = await getFloorById(floorId);
            if (!mounted) return;
            if (f) {
              setForm({
                building_id: f.building_id || '',
                floor_code: f.floor_code || '',
                name: f.name || '',
              });
            } else {
              throw new Error('Floor not found');
            }
          } catch (e) {
            // Fallback: load all floors and pick by id
            const all = await getFloors();
            if (!mounted) return;
            const f2 = (all || []).find(x => Number(x.floor_id) === Number(floorId));
            if (f2) {
              setForm({
                building_id: f2.building_id || '',
                floor_code: f2.floor_code || '',
                name: f2.name || '',
              });
            } else {
              setError('Failed to load floor for editing');
            }
          }
        }
      } catch (e) {
        if (mounted) setError('Failed to load required data');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [isEdit, floorId]);

  // Small inline icons for reserved cells
  const StairIcon = ({ size = 20, color = '#334155' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 18h4v-2h4v-2h4v-2h4" stroke={color} strokeWidth="2"/>
    </svg>
  );
  const ElevatorIcon = ({ size = 20, color = '#334155' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="6" y="5" width="12" height="14" rx="2" stroke={color} strokeWidth="2"/>
      <path d="M10 9l2-2 2 2M10 15l2 2 2-2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Icon path for types (same as LayoutManagementPage)
  const iconSrcForType = (id) => {
    const num = Number(id) || 1;
    const count = Math.ceil(num / 2);
    const orientation = (num % 2 === 1) ? 'hor' : 'ver';
    const base = process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}` : '';
    return `${base}/layoutIcons/${count}${orientation}.jpg`;
  };

  const tablesFromTypeId = (id) => Math.ceil((Number(id) || 1) / 2);

  // DnD handlers
  const onDragStartType = (e, typeId) => {
    e.dataTransfer.setData('application/x-table-type', String(typeId));
    e.dataTransfer.effectAllowed = 'copyMove';
  };
  const onDragOverCell = (e) => {
    if (e.dataTransfer.types.includes('application/x-table-type')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };
  const onDropCell = (e, key) => {
    const typeId = e.dataTransfer.getData('application/x-table-type');
    if (!typeId) return;
    setAssignments((prev) => ({ ...prev, [key]: typeId }));
    const tables = tablesFromTypeId(typeId); // number of tables decided by icon type
    setCellTables((prev) => ({ ...prev, [key]: tables }));
    setCellJobs((prev) => {
      const count = tables;
      const existing = Array.isArray(prev[key]) ? prev[key] : [];
      const next = existing.slice(0, count);
      while (next.length < count) next.push('');
      return { ...prev, [key]: next };
    });
  };
  const clearCell = (key) => {
    setAssignments((prev) => {
      const p = { ...prev };
      delete p[key];
      return p;
    });
    setCellTables((prev) => { const p = { ...prev }; delete p[key]; return p; });
    setCellJobs((prev) => { const p = { ...prev }; delete p[key]; return p; });
  };

  const openJobsForCell = (key) => {
    const tables = Number(cellTables[key] || 0);
    const existing = Array.isArray(cellJobs[key]) ? cellJobs[key] : [];
    const inputs = existing.slice(0, tables);
    while (inputs.length < tables) inputs.push('');
    setJobInputs(inputs);
    setJobModal({ open: true, key });
  };

  const closeJobsModal = () => {
    setJobModal({ open: false, key: null });
    setJobInputs([]);
  };

  const saveJobsModal = () => {
    const k = jobModal.key;
    if (!k) return;
    setCellJobs((prev) => ({ ...prev, [k]: jobInputs.map((x) => String(x || '').trim()) }));
    closeJobsModal();
  };

  const backToList = () => {
    setFloorId(null);
    setActiveSection('building-floors');
  };

  // Rooms editing removed

  const onSave = async () => {
    setError('');
    const bId = Number(form.building_id);
    const code = String(form.floor_code || '').trim();
    const name = String(form.name || '').trim();
    if (!Number.isInteger(bId) || bId <= 0) { setError('Please select a building'); return; }
    if (!code) { setError('Floor Code is required'); return; }
    if (!name) { setError('Floor Name is required'); return; }

    const b = buildingMap[bId];
    const rows = Number(b?.rows) || 0;
    const columns = Number(b?.columns) || 0;

    try {
      setSaving(true);
      if (isCreate) {
        await createFloor({ building_id: bId, floor_code: code, name, rows, columns });
      } else if (isEdit && floorId != null) {
        await patchFloor(floorId, { building_id: bId, floor_code: code, name, rows, columns });
      }
      backToList();
    } catch (e) {
      setError(e?.message || 'Failed to save floor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page role-management">
      <div className="page-header">
        <div className="left">
          <h1>{title}</h1>
          <div className="subtitle">Use Floor Code and Name. Rows/Columns are inherited from the selected building.</div>
        </div>
        <div className="right">
          <button className="secondary-btn" onClick={backToList}>Back to Floors</button>
        </div>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="no-results">Loading...</div>
        ) : (
          <div className="role-card create-card" style={{ maxWidth: isEdit ? '100%' : 640 }}>
            {error && (<div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>)}

            <div className="field">
              <label>Building</label>
              <select
                value={form.building_id}
                onChange={(e) => setForm(prev => ({ ...prev, building_id: e.target.value }))}
                disabled={false}
              >
                <option value="">Select a building</option>
                {(buildings || []).map((b) => (
                  <option key={b.building_id} value={b.building_id}>{b.name || `Building ${b.building_id}`}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Floor Code</label>
              <input
                type="text"
                value={form.floor_code}
                onChange={(e) => setForm(prev => ({ ...prev, floor_code: e.target.value }))}
              />
            </div>

            <div className="field">
              <label>Floor Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="field">
              <label>Rows (inherited)</label>
              <input type="number" value={buildingMap[Number(form.building_id)]?.rows ?? ''} readOnly disabled />
            </div>

            <div className="field">
              <label>Columns (inherited)</label>
              <input type="number" value={buildingMap[Number(form.building_id)]?.columns ?? ''} readOnly disabled />
            </div>

            {/* Integrated DnD Layout inside the same card (Edit mode only) */}
            {isEdit && Number(form.building_id) > 0 && (
              <>
                <div style={{ height: 1, background: '#e5e7eb', margin: '16px 0' }} />
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Layout Designer</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Drag items from the palette into cells below. Grid adapts to building rows/columns.</div>
                </div>

                {/* Rooms Section removed */}

                {/* Palette */}
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, background: '#f9fafb', padding: '0.5rem 0.75rem', display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  {displayTableTypes.map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => onDragStartType(e, t.id)}
                      title={`Drag ${t.name}`}
                      style={{
                        border: '1px dashed #94a3b8', background: 'white', padding: '0.35rem 0.5rem', borderRadius: 8, cursor: 'grab', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 32
                      }}
                      aria-label={t.name}
                    >
                      <img src={iconSrcForType(t.id)} alt={t.name} width={20} height={20} style={{ display: 'block' }} />
                    </div>
                  ))}
                </div>

                {/* Dynamic Grid based on building rows/columns with reserved stairs/elevator cells */}
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 8, overflow: 'auto' }}>
                  {gridRows === 0 || gridCols === 0 ? (
                    <div style={{ color: '#64748b' }}>Select a building with valid rows/columns to design the layout.</div>
                  ) : (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${gridCols}, minmax(${Math.round(60 * cellScale)}px, 1fr))`,
                        gridTemplateRows: `repeat(${gridRows}, ${Math.round(68 * cellScale)}px)`,
                        gap: Math.max(2, Math.round(4 * cellScale)),
                        minWidth: `${gridCols * Math.round(60 * cellScale) + (gridCols - 1) * Math.max(2, Math.round(4 * cellScale)) + 16}px`,
                      }}
                    >
                      {Array.from({ length: gridRows }).map((_, rIdx) => (
                        Array.from({ length: gridCols }).map((_, cIdx) => {
                          const row = rIdx + 1;
                          const col = cIdx + 1;
                          const key = `${row}-${col}`;
                          const linear = (row - 1) * gridCols + col; // 1-based sequential cell no
                          const isStairs = stairsCell != null && Number(stairsCell) === linear;
                          const isElevator = elevatorCell != null && Number(elevatorCell) === linear;
                          const assignedTypeId = assignments[key];
                          const typeName = assignedTypeId ? displayTableTypes.find((t) => String(t.id) === String(assignedTypeId))?.name : null;
                          return (
                            <div
                              key={key}
                              onDragOver={!isStairs && !isElevator ? onDragOverCell : undefined}
                              onDrop={!isStairs && !isElevator ? (e) => onDropCell(e, key) : undefined}
                              style={{
                                border: '1px solid #cbd5e1',
                                borderRadius: 10,
                                background: isStairs ? '#ecfdf5' : isElevator ? '#eff6ff' : '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                              }}
                            >
                              <div style={{ position: 'absolute', left: 6, top: 4, fontSize: Math.max(9, Math.round(10 * cellScale)), color: '#64748b' }} aria-hidden="true">{row}-{col}</div>
                              {isStairs ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0f766e', fontWeight: 600, fontSize: Math.max(10, Math.round(12 * cellScale)) }}>
                                  <StairIcon size={Math.max(14, Math.round(18 * cellScale))} /> Stairs
                                </div>
                              ) : isElevator ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1d4ed8', fontWeight: 600, fontSize: Math.max(10, Math.round(12 * cellScale)) }}>
                                  <ElevatorIcon size={Math.max(14, Math.round(18 * cellScale))} /> Elevator
                                </div>
                              ) : assignedTypeId ? (
                                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                  <button onClick={() => openJobsForCell(key)} title="Link Jobs" aria-label="Link Jobs" style={{ border: 'none', background: 'transparent', padding: 0, margin: 0, cursor: 'pointer' }}>
                                    <img src={iconSrcForType(assignedTypeId)} alt={typeName || 'Type'} width={Math.max(18, Math.round(24 * cellScale))} height={Math.max(18, Math.round(24 * cellScale))} style={{ display: 'block' }} />
                                  </button>
                                  <div style={{ fontSize: Math.max(9, Math.round(10 * cellScale)), color: '#64748b' }}>Tables: {Number(cellTables[key] ?? tablesFromTypeId(assignedTypeId))}</div>
                                  <button onClick={() => clearCell(key)} title="Remove" aria-label="Remove" style={{
                                    width: Math.max(18, Math.round(22 * cellScale)), height: Math.max(18, Math.round(22 * cellScale)), borderRadius: 6, border: '1px solid #e5e7eb', background: '#f8fafc', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                                  }}>
                                    <svg width={Math.max(10, Math.round(12 * cellScale))} height={Math.max(10, Math.round(12 * cellScale))} viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6l-12 12" stroke="#475569" strokeWidth="2" strokeLinecap="round"/></svg>
                                  </button>
                                </div>
                              ) : (
                                <div style={{ color: '#94a3b8', fontSize: Math.max(8, Math.round(10 * cellScale)) }}>•</div>
                              )}
                            </div>
                          );
                        })
                      ))}
                    </div>
                  )}
                </div>

                {/* Read-only lists: Rooms and Functions/Subfunctions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Rooms</div>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#f8fafc', padding: 8, maxHeight: 180, overflow: 'auto' }}>
                      {roomNames.length === 0 ? (
                        <div style={{ color: '#94a3b8', fontSize: 12 }}>No rooms</div>
                      ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {roomNames.map((name, idx) => (
                            <li key={`${name}-${idx}`} style={{ fontSize: 12, color: '#334155', lineHeight: '18px' }}>{name}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Functions / Subfunctions</div>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#f8fafc', padding: 8, maxHeight: 180, overflow: 'auto' }}>
                      {functionNames.length === 0 ? (
                        <div style={{ color: '#94a3b8', fontSize: 12 }}>No functions assigned</div>
                      ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {functionNames.map((name, idx) => (
                            <li key={`${name}-${idx}`} style={{ fontSize: 12, color: '#334155', lineHeight: '18px' }}>{name}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="actions" style={{ marginTop: 16 }}>
              <button className="primary-btn" onClick={onSave} disabled={saving}>
                {isCreate ? 'Create' : 'Save'}
              </button>
              <button className="secondary-btn" onClick={backToList} disabled={saving}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Jobs modal for a selected cell */}
      <FormModal
        open={Boolean(jobModal.open)}
        title={jobModal.key ? `Cell ${jobModal.key} — Link Jobs` : 'Link Jobs'}
        onCancel={closeJobsModal}
        footer={(
          <>
            <button type="button" className="danger-btn" onClick={() => { if (jobModal.key) { clearCell(jobModal.key); } closeJobsModal(); }}>Remove table from the room</button>
            <div style={{ flex: 1 }} />
            <button type="button" className="primary-btn" onClick={saveJobsModal}>Save</button>
            <button type="button" className="secondary-btn" onClick={closeJobsModal}>Cancel</button>
          </>
        )}
      >
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Place the cursor under Job and type the job name.</div>
        {(jobInputs || []).length === 0 ? (
          <div className="no-results">No tables in this cell yet. Drag a table into the cell to add.</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {jobInputs.map((val, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: 12 }}>
                <div style={{ fontWeight: 600, color: '#334155' }}>Table {idx + 1}</div>
                <input
                  type="text"
                  placeholder="JOB"
                  value={val}
                  onChange={(e) => setJobInputs((arr) => arr.map((v, i) => (i === idx ? e.target.value : v)))}
                />
              </div>
            ))}
          </div>
        )}
      </FormModal>
    </div>
  );
};

export default FloorDetailPage;
