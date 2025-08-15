import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  getCompaniesLite,
  getBuildingByCompany,
  getFloors,
  getRooms,
  getTableTypes,
  saveFloorLayout,
} from '../services/layoutService';

const LayoutManagementPage = () => {
  const { layoutCompanyId } = useAppContext();
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [building, setBuilding] = useState(null);
  const [floors, setFloors] = useState([]);
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [rooms, setRooms] = useState([]);
  const [tableTypes, setTableTypes] = useState([]);
  const [assignments, setAssignments] = useState({}); // room_id -> table_type_id
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  // Load companies and table palette
  useEffect(() => {
    (async () => {
      const [companiesData, tablePalette] = await Promise.all([
        getCompaniesLite(),
        getTableTypes(),
      ]);
      setCompanies(companiesData);
      setTableTypes(tablePalette);
    })();
  }, []);

  // Preselect company when coming from Organization page
  useEffect(() => {
    if (layoutCompanyId && !selectedCompanyId) {
      setSelectedCompanyId(layoutCompanyId);
    }
  }, [layoutCompanyId, selectedCompanyId]);

  // When company changes, load its single building and floors
  useEffect(() => {
    if (!selectedCompanyId) return;
    (async () => {
      setStatus('');
      const b = await getBuildingByCompany(selectedCompanyId);
      setBuilding(b);
      const fs = await getFloors(b?.building_id);
      setFloors(fs);
      setSelectedFloorId(fs[0]?.floor_id || '');
    })();
  }, [selectedCompanyId]);

  // When floor changes, load rooms and reset assignments (or fetch existing layout if you expose it)
  useEffect(() => {
    if (!selectedFloorId) return;
    (async () => {
      const rms = await getRooms(selectedFloorId);
      setRooms(rms);
      setAssignments({});
    })();
  }, [selectedFloorId]);

  const grid = useMemo(() => {
    // Fixed requirement: always 2 rows x 5 columns; last column reserved
    return { rows: 2, cols: 5 };
  }, []);

  // Ensure 12 icons in palette regardless of backend response length
  const displayTableTypes = useMemo(() => {
    const list = Array.isArray(tableTypes) ? tableTypes.slice(0, 12) : [];
    const out = [...list];
    for (let i = list.length; i < 12; i++) {
      out.push({ id: i + 1, name: `Type ${i + 1}` });
    }
    return out;
  }, [tableTypes]);

  // DnD handlers for palette items -> rooms
  const onDragStartType = (e, typeId) => {
    e.dataTransfer.setData('application/x-table-type', String(typeId));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  // Map a table type id to an icon path based on its index in tableTypes
  const iconSrcForType = (id) => {
    const idx = displayTableTypes.findIndex((t) => String(t.id) === String(id));
    const n = idx >= 0 ? idx + 1 : 1; // default to icon1 if not found
    const base = process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}` : '';
    // Note: folder is 'layoutIcons' (capital I) in public/ and files are .jpg
    return `${base}/layoutIcons/icon${n}.jpg`;
  };

  // Icon renderer for table types
  const TypeIcon = ({ id, size = 20, color = '#0f172a' }) => {
    const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' };
    switch (String(id)) {
      case 'desk':
        return (
          <svg {...common}>
            <rect x="3" y="7" width="18" height="4" rx="1.5" fill={color} />
            <rect x="5" y="12" width="2" height="5" rx="1" fill={color} />
            <rect x="17" y="12" width="2" height="5" rx="1" fill={color} />
          </svg>
        );
      case 'double-desk':
        return (
          <svg {...common}>
            <rect x="2" y="6" width="20" height="4" rx="1.5" fill={color} />
            <rect x="2" y="14" width="20" height="4" rx="1.5" fill={color} />
          </svg>
        );
      case 'workbench':
        return (
          <svg {...common}>
            <rect x="3" y="5" width="18" height="6" rx="1.5" fill={color} />
            <rect x="3" y="13" width="18" height="6" rx="1.5" fill={color} />
          </svg>
        );
      case 'meeting':
        return (
          <svg {...common}>
            <rect x="5" y="7" width="14" height="10" rx="2" fill={color} />
            <circle cx="8" cy="12" r="1.2" fill="#fff" />
            <circle cx="12" cy="12" r="1.2" fill="#fff" />
            <circle cx="16" cy="12" r="1.2" fill="#fff" />
          </svg>
        );
      case 'sofa':
        return (
          <svg {...common}>
            <rect x="4" y="10" width="16" height="6" rx="2" fill={color} />
            <rect x="3" y="12" width="2" height="4" rx="1" fill={color} />
            <rect x="19" y="12" width="2" height="4" rx="1" fill={color} />
          </svg>
        );
      case 'storage':
        return (
          <svg {...common}>
            <rect x="5" y="5" width="14" height="14" rx="2" stroke={color} strokeWidth="2" />
            <rect x="7" y="8" width="10" height="3" rx="1" fill={color} />
            <rect x="7" y="13" width="10" height="3" rx="1" fill={color} />
          </svg>
        );
      default:
        return (
          <svg {...common}>
            <rect x="4" y="8" width="16" height="8" rx="2" fill={color} />
          </svg>
        );
    }
  };

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
  const onDragOverRoom = (e) => {
    if (e.dataTransfer.types.includes('application/x-table-type')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };
  const onDropRoom = (e, roomId) => {
    const typeId = e.dataTransfer.getData('application/x-table-type');
    if (!typeId) return;
    setAssignments((prev) => ({ ...prev, [roomId]: typeId }));
  };
  const clearRoom = (roomId) => {
    setAssignments((prev) => {
      const p = { ...prev };
      delete p[roomId];
      return p;
    });
  };

  const doSave = async () => {
    if (!selectedFloorId) return;
    setSaving(true);
    setStatus('');
    try {
      const payload = Object.entries(assignments).map(([room_id, table_type_id]) => ({ room_id: Number(room_id), table_type_id }));
      await saveFloorLayout(selectedFloorId, payload);
      setStatus('Layout saved');
    } catch (e) {
      setStatus('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">Layout Management</h2>
        <p className="page-subtitle">Select an organization → floor → drag tables into rooms.</p>
      </div>

      <div className="page-content" style={{ display: 'grid', gap: '1rem' }}>
        {/* Selectors */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#64748b' }}>Organization</label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, minWidth: 220 }}
            >
              <option value="">Select company</option>
              {companies.map((c) => (
                <option key={c.company_id} value={c.company_id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#64748b' }}>Building</label>
            <input value={building?.name || ''} readOnly placeholder="Auto from company" style={{ padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, minWidth: 220 }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#64748b' }}>Floor</label>
            <select
              value={selectedFloorId}
              onChange={(e) => setSelectedFloorId(e.target.value)}
              disabled={!floors.length}
              style={{ padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, minWidth: 220 }}
            >
              {floors.map((f) => (
                <option key={f.floor_id} value={f.floor_id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={doSave} disabled={!selectedFloorId || saving} className="primary-btn" style={{
              padding: '0.6rem 1rem', borderRadius: 8, border: 'none', color: 'white',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 6px 16px rgba(16,185,129,0.25)'
            }}>
              {saving ? 'Saving…' : 'Save Layout'}
            </button>
            {status && <div style={{ alignSelf: 'center', color: '#64748b' }}>{status}</div>}
          </div>
        </div>

        {/* Palette */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, background: '#f9fafb', padding: '0.5rem 0.75rem', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {displayTableTypes.map((t) => (
            <div key={t.id} draggable onDragStart={(e) => onDragStartType(e, t.id)} title={`Drag ${t.name}`} style={{
              border: '1px dashed #94a3b8', background: 'white', padding: '0.35rem 0.5rem', borderRadius: 8, cursor: 'grab', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 32
            }} aria-label={t.name}>
              <img src={iconSrcForType(t.id)} alt={t.name} width={20} height={20} style={{ display: 'block' }} />
            </div>
          ))}
        </div>

        {/* Grid */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
          {!rooms.length ? (
            <div style={{ color: '#64748b' }}>Select a company and floor to start.</div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${grid.cols}, minmax(120px, 1fr))`,
                gridTemplateRows: `repeat(${grid.rows}, 100px)`,
                gap: 8,
              }}
            >
              {Array.from({ length: grid.rows }).map((_, rIdx) => (
                Array.from({ length: grid.cols }).map((_, cIdx) => {
                  const row = rIdx + 1;
                  const col = cIdx + 1;
                  const reserved = col === 5; // last column reserved
                  if (reserved) {
                    return (
                      <div key={`reserved-${row}-${col}`} style={{
                        border: '1px solid #cbd5e1',
                        borderRadius: 10,
                        background: '#f1f5f9',
                        color: '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        fontWeight: 600,
                      }}>
                        <div style={{ position: 'absolute', left: 8, top: 6, fontSize: 11, color: '#64748b' }} aria-hidden="true">&nbsp;</div>
                        {row === 1 ? <StairIcon /> : <ElevatorIcon />}
                      </div>
                    );
                  }
                  const room = rooms.find((rm) => Number(rm.cell_row) === row && Number(rm.cell_column) === col);
                  const assignedTypeId = room ? assignments[room.room_id] : null;
                  const typeName = assignedTypeId ? displayTableTypes.find((t) => String(t.id) === String(assignedTypeId))?.name : null;
                  return (
                    <div
                      key={room?.room_id || `empty-${row}-${col}`}
                      onDragOver={room ? onDragOverRoom : undefined}
                      onDrop={room ? (e) => onDropRoom(e, room.room_id) : undefined}
                      style={{
                        border: '1px solid #cbd5e1',
                        borderRadius: 10,
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        opacity: room ? 1 : 0.5,
                      }}
                    >
                      <div style={{ position: 'absolute', left: 8, top: 6, fontSize: 11, color: '#64748b' }} aria-hidden="true">&nbsp;</div>
                      {room ? (
                        assignedTypeId ? (
                          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                            <img src={iconSrcForType(assignedTypeId)} alt={typeName || 'Type'} width={28} height={28} style={{ display: 'block' }} />
                            <button onClick={() => clearRoom(room.room_id)} title="Remove" aria-label="Remove" style={{
                              width: 26, height: 26, borderRadius: 6, border: '1px solid #e5e7eb', background: '#f8fafc', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6l-12 12" stroke="#475569" strokeWidth="2" strokeLinecap="round"/></svg>
                            </button>
                          </div>
                        ) : (
                          <div style={{ color: '#94a3b8', fontSize: 12 }}>•</div>
                        )
                      ) : (
                        <div style={{ color: '#94a3b8', fontSize: 12 }}>•</div>
                      )}
                    </div>
                  );
                })
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LayoutManagementPage;
