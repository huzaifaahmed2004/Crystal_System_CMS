import React, { useEffect, useMemo, useState } from 'react';
import '../styles/role-management.css';
import { useAppContext } from '../context/AppContext';
import { getBuildings } from '../services/buildingService';
import { getFloorById, getFloors, createFloor, patchFloor, getFloorWithRelations } from '../services/floorService';
import { createTable, deleteTable, addTableJob, deleteTableJob, getTableJobs, getTablesWithRelations } from '../services/tableService';
import { getJobs } from '../services/jobService';
import FormModal from '../components/ui/FormModal';

const FloorDetailPage = () => {
  const { setActiveSection, floorFormMode, floorId, setFloorId } = useAppContext();

  const isCreate = floorFormMode === 'create';
  const isEdit = floorFormMode === 'edit';

  const [buildings, setBuildings] = useState([]);
  const [allFloors, setAllFloors] = useState([]);
  const [lastAuto, setLastAuto] = useState({ building_id: null, code: '', name: '' });
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
  const [cellTableIds, setCellTableIds] = useState({}); // key -> created table id (for delete)
  const [cellTableTypes, setCellTableTypes] = useState({}); // key -> array of typeIds per table index
  const [jobModal, setJobModal] = useState({ open: false, key: null, index: null });
  const [jobInputs, setJobInputs] = useState([]); // working copy for modal inputs per slot [jobId|string]
  const [jobErrors, setJobErrors] = useState([]); // reserved
  const [modalError, setModalError] = useState(''); // modal-level error (e.g., API delete failure)
  const [cellScale, setCellScale] = useState(1); // zoom for grid cells (fixed now)
  const [companyJobs, setCompanyJobs] = useState([]); // jobs for the building's company
  const [slotLocked, setSlotLocked] = useState([]); // lock state per slot
  const [confirmRemove, setConfirmRemove] = useState({ open: false, key: null, index: null });
  const [usedJobIdsGlobal, setUsedJobIdsGlobal] = useState(new Set()); // jobs already assigned on any table
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

  // Auto-fill floor name and code on building selection in Create mode
  useEffect(() => {
    if (!isCreate) return;
    const bIdNum = Number(form.building_id);
    if (!Number.isFinite(bIdNum) || bIdNum <= 0) return;
    const b = buildingMap[bIdNum];
    if (!b) return;

    const re = /^Fl(\d+)/i;
    const floorsForBuilding = (allFloors || []).filter((f) => Number(f.building_id) === bIdNum);
    const lastIdx = floorsForBuilding.reduce((max, f) => {
      const m = re.exec(String(f.floor_code || f.floorCode || ''));
      if (!m) return max;
      const n = Number(m[1]);
      return Number.isFinite(n) && n > max ? n : max;
    }, -1);
    const nextIdx = lastIdx + 1; // 0 if none -> Ground

    const ordinals = ['Ground', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth', 'Twentieth'];
    const nameOrdinal = nextIdx === 0 ? 'Ground' : (ordinals[nextIdx] || `${nextIdx}th`);
    const autoName = `${nameOrdinal} Floor`;

    const bname = String(b.name || '').trim();
    const three = bname.slice(0, 3);
    const threeFormatted = three ? (three[0].toUpperCase() + three.slice(1).toLowerCase()) : '';
    const autoCode = `Fl${nextIdx}${threeFormatted}`;

    setForm((prev) => {
      const isPrevAutoCode = prev.floor_code === '' || (lastAuto.building_id != null && prev.floor_code === lastAuto.code);
      const isPrevAutoName = prev.name === '' || (lastAuto.building_id != null && prev.name === lastAuto.name);
      const next = {
        ...prev,
        floor_code: isPrevAutoCode ? autoCode : prev.floor_code,
        name: isPrevAutoName ? autoName : prev.name,
      };
      return next;
    });
    setLastAuto({ building_id: bIdNum, code: autoCode, name: autoName });
  }, [isCreate, form.building_id, buildingMap, allFloors]);

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

  // Keep Functions/Subfunctions panel empty for now (no backend functions)
  const functionNames = useMemo(() => [], []);

  // Load jobs for the selected building's company to populate the modal dropdowns
  useEffect(() => {
    let mounted = true;
    (async () => {
      const companyId = Number(selectedBuilding?.company_id);
      if (!Number.isFinite(companyId) || companyId <= 0) { if (mounted) setCompanyJobs([]); return; }
      try {
        const all = await getJobs();
        const filtered = Array.isArray(all) ? all.filter(j => Number(j?.company_id) === companyId) : [];
        // De-duplicate by job name for clean dropdown
        const seen = new Set();
        const list = [];
        filtered.forEach(j => {
          const label = String(j?.name || j?.jobCode || j?.job_code || '').trim() || `Job ${j?.id || j?.job_id || ''}`;
          if (!seen.has(label)) { seen.add(label); list.push({ id: j?.id ?? j?.job_id, label }); }
        });
        if (mounted) setCompanyJobs(list);
      } catch (_) {
        if (mounted) setCompanyJobs([]);
      }
    })();
    return () => { mounted = false; };
  }, [selectedBuilding?.company_id]);

  // Support hard refresh on Edit page by restoring floorId from URL or localStorage
  const urlParams = useMemo(() => {
    try { return new URLSearchParams(window.location.search); } catch (_) { return new URLSearchParams(); }
  }, []);
  const urlFloorId = useMemo(() => {
    const v = urlParams.get('floorId') || urlParams.get('id');
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [urlParams]);
  const persistedFloorId = useMemo(() => {
    try {
      const v = localStorage.getItem('floorEditId');
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    } catch (_) { return null; }
  }, []);
  const effectiveFloorId = useMemo(() => urlFloorId || persistedFloorId || floorId, [urlFloorId, persistedFloorId, floorId]);
  const effectiveIsEdit = useMemo(
    () => Boolean(isEdit || (!isCreate && (urlFloorId || persistedFloorId))),
    [isEdit, isCreate, urlFloorId, persistedFloorId]
  );

  const title = useMemo(() => {
    if (effectiveIsEdit) return 'Edit Floor';
    return 'Create Floor';
  }, [effectiveIsEdit]);

  // Persist current edit id when available
  useEffect(() => {
    try {
      if (isEdit && floorId != null) localStorage.setItem('floorEditId', String(floorId));
    } catch (_) {}
  }, [isEdit, floorId]);

  // Clear persisted edit id only on true Create navigation (no URL/persisted id)
  useEffect(() => {
    if (isCreate && !urlFloorId && !persistedFloorId) {
      try { localStorage.removeItem('floorEditId'); } catch (_) {}
    }
  }, [isCreate, urlFloorId, persistedFloorId]);

  // Rooms for this floor (to map row/col -> room_id)
  const [floorRooms, setFloorRooms] = useState([]);
  const roomIdByCell = useMemo(() => {
    const m = new Map();
    (floorRooms || []).forEach((r) => {
      const key = `${r.cell_row}-${r.cell_column}`;
      m.set(key, r.room_id ?? r.id);
    });
    return m;
  }, [floorRooms]);

  // Map key -> full room (to inspect cellType)
  const roomByCell = useMemo(() => {
    const m = new Map();
    (floorRooms || []).forEach((r) => {
      const key = `${r.cell_row}-${r.cell_column}`;
      m.set(key, r);
    });
    return m;
  }, [floorRooms]);

  useEffect(() => {
    setActiveSection('floor-detail');
    (async () => {
      try {
        const [bld, _floors] = await Promise.all([
          getBuildings().catch(() => []),
          getFloors().catch(() => [])
        ]);
        setBuildings(bld);
        setAllFloors(_floors || []);
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
        if (effectiveIsEdit && effectiveFloorId != null) {
          try {
            const f = await getFloorById(effectiveFloorId);
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
            const f2 = (all || []).find(x => Number(x.floor_id) === Number(effectiveFloorId));
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
  }, [effectiveIsEdit, effectiveFloorId]);

  // Load floor with relations on edit and pre-populate the layout state
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!(effectiveIsEdit && effectiveFloorId != null)) { setFloorRooms([]); return; }
      try {
        const data = await getFloorWithRelations(effectiveFloorId);
        if (!mounted || !data) return;

        // Map rooms to our expected shape { room_id, cell_row, cell_column }
        const rooms = Array.isArray(data.rooms) ? data.rooms.map((r) => ({
          room_id: r.room_id ?? r.id,
          cell_row: r.cell_row ?? r.row,
          cell_column: r.cell_column ?? r.column,
          cellType: r.cellType ?? r.cell_type ?? '',
          tables: Array.isArray(r.tables) ? r.tables : [],
        })) : [];
        setFloorRooms(rooms);

        // Pre-populate grid state from tables (support up to 2 tables per cell, same orientation)
        const nextAssignments = {};
        const nextCellTables = {};
        const nextCellTableIds = {};
        const nextCellTableTypes = {};
        rooms.forEach((r) => {
          const key = `${r.cell_row}-${r.cell_column}`;
          const tables = Array.isArray(r.tables) ? r.tables.slice(0, 2) : [];
          if (tables.length === 0) return;

          // Compute typeIds for each table and set first as assignment
          const computedTypes = tables.map((t) => {
            const cap = Number(t.capacity) || 0;
            const hor = String(t.orientation || '').toUpperCase() === 'HORIZONTAL';
            return String(hor ? (cap * 2 - 1) : (cap * 2));
          });
          const firstTypeId = computedTypes[0];
          nextAssignments[key] = String(firstTypeId);

          // Number of tables in this cell
          nextCellTables[key] = tables.length;

          // Collect created table IDs
          nextCellTableIds[key] = tables
            .map((t) => (t.table_id ?? t.id))
            .filter((id) => id != null);
          // Collect per-table types
          nextCellTableTypes[key] = computedTypes.slice(0, tables.length);
        });
        setAssignments(nextAssignments);
        setCellTables(nextCellTables);
        setCellTableIds(nextCellTableIds);
        setCellTableTypes(nextCellTableTypes);
      } catch (_) {
        if (mounted) {
          setFloorRooms([]);
        }
      }
    })();
    return () => { mounted = false; };
  }, [effectiveIsEdit, effectiveFloorId]);

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

  // Remove a single table from a cell by index (0 or 1)
  const removeTableAt = async (key, index) => {
    try {
      setModalError('');
      const raw = cellTableIds[key];
      const ids = Array.isArray(raw) ? raw.slice() : (raw != null ? [raw] : []);
      if (index < 0 || index >= ids.length) return; // nothing to remove
      const id = ids[index];
      if (id != null) {
        try { await deleteTable(id); } catch (e) { setModalError('Failed to delete table.'); return; }
      }
      // Update ids and counts
      ids.splice(index, 1);
      const newCount = ids.length;
      setCellTableIds((prev) => ({ ...prev, [key]: ids }));
      if (newCount === 0) {
        setAssignments((prev) => { const p = { ...prev }; delete p[key]; return p; });
        setCellTables((prev) => { const p = { ...prev }; delete p[key]; return p; });
        setCellJobs((prev) => { const p = { ...prev }; delete p[key]; return p; });
        setCellTableIds((prev) => { const p = { ...prev }; delete p[key]; return p; });
        setCellTableTypes((prev) => { const p = { ...prev }; delete p[key]; return p; });
      } else {
        setCellTables((prev) => ({ ...prev, [key]: newCount }));
        // Also remove corresponding job input if present in modal working copy
        setJobInputs((arr) => arr.filter((_, i) => i !== index));
        setJobErrors((arr) => arr.filter((_, i) => i !== index));
        setCellJobs((prev) => {
          const existing = Array.isArray(prev[key]) ? prev[key].slice() : [];
          const next = existing.filter((_, i) => i !== index).slice(0, newCount);
          return { ...prev, [key]: next };
        });
        // Remove matching type entry
        setCellTableTypes((prev) => {
          const arr = Array.isArray(prev[key]) ? prev[key].slice() : [];
          const next = arr.filter((_, i) => i !== index).slice(0, newCount);
          return { ...prev, [key]: next };
        });
      }
    } catch (_) {
      setModalError('Unexpected error while removing table.');
    }
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
  const onDropCell = async (e, key) => {
    const typeId = e.dataTransfer.getData('application/x-table-type');
    if (!typeId) return;
    // Normalize existing per-cell state
    const existingIdsRaw = cellTableIds[key];
    const existingIds = Array.isArray(existingIdsRaw)
      ? existingIdsRaw.slice()
      : (existingIdsRaw != null ? [existingIdsRaw] : []);
    const existingCount = existingIds.length;

    // Rule 1: Max 2 tables per cell
    if (existingCount >= 2) {
      setError('A cell can have at most 2 tables.');
      return;
    }
    // Rule 2: Lock ELEVATOR/STAIRS cells
    const room = roomByCell.get(key);
    const ct = String(room?.cellType || '').toUpperCase();
    if (ct === 'ELEVATOR' || ct === 'STAIRS') {
      setError(`Cannot place table on a locked ${ct} cell.`);
      return;
    }
    // Rule 3: Orientation must match existing tables in the cell (if any)
    const droppingIsHor = (Number(typeId) % 2 === 1);
    if (existingCount > 0) {
      const firstExistingType = (Array.isArray(cellTableTypes[key]) && cellTableTypes[key][0]) || assignments[key];
      const existingIsHor = (Number(firstExistingType) % 2 === 1);
      if (existingIsHor !== droppingIsHor) {
        setError('All tables in a cell must have the same orientation.');
        return;
      }
    }
    // Set/keep assignment (orientation/capacity reference) from the first table
    setAssignments((prev) => ({ ...prev, [key]: prev[key] ?? typeId }));
    // Update number of tables in this cell (1 or 2)
    const newCount = existingCount + 1;
    setCellTables((prev) => ({ ...prev, [key]: newCount }));
    setCellJobs((prev) => {
      const count = newCount;
      const existing = Array.isArray(prev[key]) ? prev[key] : [];
      const next = existing.slice(0, count);
      while (next.length < count) next.push('');
      return { ...prev, [key]: next };
    });
    // Track per-table type id
    setCellTableTypes((prev) => {
      const arr = Array.isArray(prev[key]) ? prev[key].slice() : [];
      arr.push(String(typeId));
      return { ...prev, [key]: arr.slice(0, newCount) };
    });

    // Immediately call API to create a table for this room
    try {
      const [row, col] = key.split('-').map((n) => Number(n));
      const roomId = roomIdByCell.get(key);
      if (!roomId) {
        setError('No room found for this cell');
        return;
      }
      const capacity = tablesFromTypeId(typeId);
      const isHor = droppingIsHor;
      const orientation = isHor ? 'HORIZONTAL' : 'VERTICAL';
      const letter = isHor ? 'H' : 'V';
      const indexInCell = (existingCount + 1); // 1 for first, 2 for second
      const tableCode = `T-${capacity}-${letter}-${roomId}-${indexInCell}`;
      const name = `Table-${capacity} Person`;
      const created = await createTable({ tableCode, name, room_id: roomId, capacity, orientation });
      const createdId = created?.id ?? created?.table_id;
      if (createdId != null) {
        setCellTableIds((prev) => {
          const arrRaw = prev[key];
          const arr = Array.isArray(arrRaw) ? arrRaw.slice() : (arrRaw != null ? [arrRaw] : []);
          arr.push(createdId);
          return { ...prev, [key]: arr };
        });
      }
    } catch (err) {
      // Revert only the last optimistic addition
      setCellTableIds((prev) => {
        const arr = Array.isArray(prev[key]) ? prev[key].slice() : (prev[key] != null ? [prev[key]] : []);
        if (arr.length > 0) arr.pop();
        if (arr.length === 0) { const p = { ...prev }; delete p[key]; return p; }
        return { ...prev, [key]: arr };
      });
      setCellTables((prev) => {
        const cur = Number(prev[key]) || 0;
        if (cur <= 1) { const p = { ...prev }; delete p[key]; return p; }
        return { ...prev, [key]: cur - 1 };
      });
      setCellJobs((prev) => {
        const arr = Array.isArray(prev[key]) ? prev[key].slice() : [];
        if (arr.length > 0) arr.pop();
        if (arr.length === 0) { const p = { ...prev }; delete p[key]; return p; }
        return { ...prev, [key]: arr };
      });
      setCellTableTypes((prev) => {
        const arr = Array.isArray(prev[key]) ? prev[key].slice() : [];
        if (arr.length > 0) arr.pop();
        if (arr.length === 0) { const p = { ...prev }; delete p[key]; return p; }
        return { ...prev, [key]: arr };
      });
      // If no tables remain, remove assignment
      setAssignments((prev) => {
        const count = Number(cellTables[key]) || 0;
        if (count - 1 <= 0) { const p = { ...prev }; delete p[key]; return p; }
        return prev;
      });
      setError('Failed to create table for this room');
    }
  };
  const clearCell = async (key) => {
    // Call delete API if a table exists for this cell
    try {
      const raw = cellTableIds[key];
      const ids = Array.isArray(raw) ? raw : (raw != null ? [raw] : []);
      for (const id of ids) {
        if (id != null) {
          try { await deleteTable(id); } catch (_) {}
        }
      }
    } catch (_) {
      // ignore errors on delete, proceed to clear UI
    }
    setAssignments((prev) => {
      const p = { ...prev };
      delete p[key];
      return p;
    });
    setCellTables((prev) => { const p = { ...prev }; delete p[key]; return p; });
    setCellJobs((prev) => { const p = { ...prev }; delete p[key]; return p; });
    setCellTableIds((prev) => { const p = { ...prev }; delete p[key]; return p; });
    setCellTableTypes((prev) => { const p = { ...prev }; delete p[key]; return p; });
  };

  const openJobsForTable = async (key, index) => {
    const idx = Number(index) || 0;
    const typeForTable = (Array.isArray(cellTableTypes[key]) && cellTableTypes[key][idx]) || assignments[key];
    const capacity = tablesFromTypeId(typeForTable);
    const existingTables = Array.isArray(cellJobs[key]) ? cellJobs[key] : [];
    const existingForTable = existingTables[idx]; // expect array of jobIds or ''
    let values = Array.isArray(existingForTable) ? existingForTable.slice(0, capacity) : [];
    while (values.length < capacity) values.push('');
    // Try to fetch from server to ensure accuracy
    try {
      const tableIds = Array.isArray(cellTableIds[key]) ? cellTableIds[key] : (cellTableIds[key] != null ? [cellTableIds[key]] : []);
      const tableId = tableIds[idx];
      if (tableId) {
        const server = await getTableJobs(tableId);
        if (Array.isArray(server) && server.length > 0) {
          const assignedIds = server.map(r => Number(r?.job_id)).filter(Boolean).slice(0, capacity);
          values = assignedIds.slice(0, capacity);
          while (values.length < capacity) values.push('');
        }
      }
      // Also get all tables to compute globally used jobs (so they can't be reused)
      const allTables = await getTablesWithRelations();
      const used = new Set();
      (allTables || []).forEach(t => {
        const tj = Array.isArray(t?.tableJobs) ? t.tableJobs : [];
        tj.forEach(it => { const id = Number(it?.job_id); if (id) used.add(id); });
      });
      setUsedJobIdsGlobal(used);
    } catch (_) { /* ignore and keep local */ }
    setJobInputs(values);
    setJobErrors(new Array(values.length).fill(''));
    setModalError('');
    setSlotLocked(values.map(v => Boolean(v)));
    setJobModal({ open: true, key, index: idx });
  };

  const closeJobsModal = () => {
    setJobModal({ open: false, key: null, index: null });
    setJobInputs([]);
    setJobErrors([]);
    setModalError('');
  };

  const openConfirmRemove = () => {
    if (jobModal.key != null && Number.isFinite(Number(jobModal.index))) {
      setConfirmRemove({ open: true, key: jobModal.key, index: Number(jobModal.index) });
    }
  };
  const closeConfirmRemove = () => setConfirmRemove({ open: false, key: null, index: null });
  const confirmRemoveTable = async () => {
    const { key, index } = confirmRemove;
    if (key == null || !Number.isFinite(Number(index))) { closeConfirmRemove(); return; }
    await removeTableAt(key, Number(index));
    closeConfirmRemove();
    closeJobsModal();
  };

  // Assign job immediately when chosen for a specific slot
  const onSelectJobAt = async (slotIndex, jobIdStr) => {
    const k = jobModal.key;
    const idx = Number(jobModal.index);
    if (!k || !Number.isFinite(idx)) return;
    const jobId = Number(jobIdStr) || null;
    setModalError('');
    setJobInputs(arr => arr.map((v, i) => (i === slotIndex ? (jobId || '') : v)));
    if (!jobId) return; // no selection
    try {
      const tableIds = Array.isArray(cellTableIds[k]) ? cellTableIds[k] : (cellTableIds[k] != null ? [cellTableIds[k]] : []);
      const tableId = tableIds[idx];
      if (!tableId) { setModalError('Missing table id for this cell'); return; }
      await addTableJob(tableId, jobId);
      // Persist in state: ensure an array of jobIds per table
      setCellJobs((prev) => {
        const tables = Array.isArray(prev[k]) ? prev[k].slice() : [];
        while (tables.length <= idx) tables.push([]);
        const current = Array.isArray(tables[idx]) ? tables[idx].slice() : [];
        current[slotIndex] = jobId;
        tables[idx] = current;
        return { ...prev, [k]: tables };
      });
      setSlotLocked(arr => arr.map((v, i) => (i === slotIndex ? true : v)));
      // Re-fetch to refresh disabled options and locks from server
      await openJobsForTable(k, idx);
    } catch (e) {
      setModalError('Failed to assign job.');
    }
  };

  const onChangeJobAt = async (slotIndex) => {
    const k = jobModal.key;
    const idx = Number(jobModal.index);
    if (!k || !Number.isFinite(idx)) return;
    const currentArr = Array.isArray(cellJobs[k]) ? cellJobs[k] : [];
    const perTable = Array.isArray(currentArr[idx]) ? currentArr[idx] : [];
    const currentJobId = perTable[slotIndex] || null;
    const tableIds = Array.isArray(cellTableIds[k]) ? cellTableIds[k] : (cellTableIds[k] != null ? [cellTableIds[k]] : []);
    const tableId = tableIds[idx];
    if (!tableId || !currentJobId) { setSlotLocked(arr => arr.map((v, i) => (i === slotIndex ? false : v))); setJobInputs(arr => arr.map((v, i) => (i === slotIndex ? '' : v))); return; }
    try {
      await deleteTableJob(tableId, currentJobId);
      setCellJobs((prev) => {
        const tables = Array.isArray(prev[k]) ? prev[k].slice() : [];
        while (tables.length <= idx) tables.push([]);
        const current = Array.isArray(tables[idx]) ? tables[idx].slice() : [];
        current[slotIndex] = '';
        tables[idx] = current;
        return { ...prev, [k]: tables };
      });
      setSlotLocked(arr => arr.map((v, i) => (i === slotIndex ? false : v)));
      setJobInputs(arr => arr.map((v, i) => (i === slotIndex ? '' : v)));
      // Re-fetch to refresh disabled options and locks from server
      await openJobsForTable(k, idx);
    } catch (e) {
      setModalError('Failed to remove job from this table.');
    }
  };

  const backToList = () => {
    try { localStorage.removeItem('floorEditId'); } catch (_) {}
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

    try {
      setSaving(true);
      if (!effectiveIsEdit) {
        await createFloor({ building_id: bId, floorCode: code, name });
      } else if (effectiveIsEdit && effectiveFloorId != null) {
        await patchFloor(effectiveFloorId, { floorCode: code, name });
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
                disabled={effectiveIsEdit}
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
            {effectiveIsEdit && Number(form.building_id) > 0 && (
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
                          // Prefer room.cellType when available, fallback to building-level reserved cells
                          const room = roomByCell.get(key);
                          const ct = String(room?.cellType || '').toUpperCase();
                          const isStairs = ct ? ct === 'STAIRS' : (stairsCell != null && Number(stairsCell) === linear);
                          const isElevator = ct ? ct === 'ELEVATOR' : (elevatorCell != null && Number(elevatorCell) === linear);
                          const assignedTypeId = assignments[key];
                          const typeName = assignedTypeId ? displayTableTypes.find((t) => String(t.id) === String(assignedTypeId))?.name : null;
                          const tablesInCell = Number(cellTables[key] || (Array.isArray(cellTableIds[key]) ? cellTableIds[key].length : (cellTableIds[key] != null ? 1 : 0)) || 0);
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
                              ) : tablesInCell > 0 ? (
                                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                  <div title="Link Jobs" aria-label="Link Jobs">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                      {Array.from({ length: Math.min(tablesInCell, 2) }).map((_, i) => {
                                        const typeIdForIcon = (Array.isArray(cellTableTypes[key]) && cellTableTypes[key][i]) || assignedTypeId;
                                        const iconAlt = displayTableTypes.find((t) => String(t.id) === String(typeIdForIcon))?.name || 'Type';
                                        return (
                                        <div key={i} style={{ position: 'relative', width: Math.max(24, Math.round(28 * cellScale)), height: Math.max(24, Math.round(28 * cellScale)), cursor: 'pointer' }} onClick={() => openJobsForTable(key, i)}>
                                          <img src={iconSrcForType(typeIdForIcon)} alt={iconAlt} width={Math.max(18, Math.round(24 * cellScale))} height={Math.max(18, Math.round(24 * cellScale))} style={{ display: 'block', margin: '0 auto' }} />
                                          <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); removeTableAt(key, i); }}
                                            title={`Remove Table ${i + 1}`}
                                            aria-label={`Remove Table ${i + 1}`}
                                            style={{
                                              position: 'absolute', right: -6, top: -6,
                                              width: Math.max(14, Math.round(16 * cellScale)), height: Math.max(14, Math.round(16 * cellScale)),
                                              borderRadius: '50%', border: '1px solid #e5e7eb', background: '#f8fafc',
                                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                            }}
                                          >
                                            <svg width={Math.max(8, Math.round(10 * cellScale))} height={Math.max(8, Math.round(10 * cellScale))} viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6l-12 12" stroke="#475569" strokeWidth="2" strokeLinecap="round"/></svg>
                                          </button>
                                        </div>
                                      );})}
                                    </div>
                                  </div>
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

      {/* Jobs modal for a selected table */}
      <FormModal
        open={Boolean(jobModal.open)}
        title={jobModal.key != null && Number.isFinite(Number(jobModal.index)) ? `Cell ${jobModal.key} • Table ${Number(jobModal.index) + 1} — Link Job` : 'Link Job'}
        onCancel={closeJobsModal}
        footer={(
          <>
            <button type="button" className="danger-btn" onClick={openConfirmRemove}>Remove this table</button>
            <div style={{ flex: 1 }} />
            <button type="button" className="secondary-btn" onClick={closeJobsModal}>Close</button>
          </>
        )}
      >
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Select jobs for this table. Number of assignments equals table capacity. Each selection assigns immediately and locks; use Change to update that slot.</div>
        {modalError ? (<div style={{ color: '#b91c1c', fontSize: 12, marginBottom: 10 }}>{modalError}</div>) : null}
        {(jobInputs || []).length === 0 ? (
          <div className="no-results">No table selected.</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {jobInputs.map((val, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', alignItems: 'center', gap: 12 }}>
                <div style={{ fontWeight: 600, color: '#334155' }}>Job {idx + 1}</div>
                <div>
                  <select
                    value={val || ''}
                    onChange={(e) => onSelectJobAt(idx, e.target.value)}
                    style={{ width: '100%' }}
                    disabled={Boolean(slotLocked[idx])}
                  >
                    <option value="">Select a job…</option>
                    {companyJobs.map(j => {
                      const cur = Number(val || 0);
                      const disabled = usedJobIdsGlobal.has(Number(j.id)) && Number(j.id) !== cur;
                      return (
                        <option key={j.id ?? j.label} value={j.id} disabled={disabled}>{j.label}{disabled ? ' (assigned)' : ''}</option>
                      );
                    })}
                  </select>
                  {companyJobs.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>No jobs found for this company.</div>
                  ) : null}
                </div>
                {slotLocked[idx] && (
                  <button type="button" className="secondary-btn" onClick={() => onChangeJobAt(idx)}>Change</button>
                )}
              </div>
            ))}
          </div>
        )}
      </FormModal>

      {/* Confirm remove table modal */}
      <FormModal
        open={Boolean(confirmRemove.open)}
        title="Remove Table?"
        onCancel={closeConfirmRemove}
        footer={(
          <>
            <button type="button" className="secondary-btn" onClick={closeConfirmRemove}>Cancel</button>
            <button type="button" className="danger-btn" onClick={confirmRemoveTable}>Yes, remove</button>
          </>
        )}
      >
        <div style={{ fontSize: 14, color: '#334155' }}>
          This will permanently remove this table from the layout and delete its job assignments. Are you sure?
        </div>
      </FormModal>
    </div>
  );
};

export default FloorDetailPage;
