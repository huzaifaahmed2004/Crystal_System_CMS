import React, { useEffect, useMemo, useState } from 'react';
import '../styles/role-management.css';
import { getBuildings } from '../services/buildingService';
import { getFloors, getFloorById, createFloor, patchFloor, deleteFloor, deleteFloorsBulk } from '../services/floorService';
import FormModal from '../components/ui/FormModal';
import Modal from '../components/ui/Modal';

const FloorManagementPage = () => {
  const [buildings, setBuildings] = useState([]);
  const buildingMap = useMemo(() => Object.fromEntries((buildings || []).map(b => [Number(b.building_id), b])), [buildings]);
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchId, setSearchId] = useState('');

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ building_id: '', floor_no: '' });
  const [createError, setCreateError] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ floor_no: '' });

  const [modal, setModal] = useState({ open: false, title: 'Notice', message: '' });
  const openModal = (title, message) => setModal({ open: true, title, message });
  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [bs, list] = await Promise.all([
          getBuildings(),
          getFloors(),
        ]);
        if (!mounted) return;
        setBuildings(Array.isArray(bs) ? bs : []);
        setFloors(Array.isArray(list) ? list : []);
        setError('');
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load floors');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const allSelected = useMemo(() => floors.length > 0 && selectedIds.size === floors.length, [floors, selectedIds]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(floors.map(f => f.floor_id)));
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const reloadAll = async () => {
    try {
      setLoading(true);
      const list = await getFloors();
      setFloors(Array.isArray(list) ? list : []);
      setError('');
    } catch (e) {
      setError('Failed to load floors');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    const id = String(searchId).trim();
    if (!id) { await reloadAll(); return; }
    try {
      setLoading(true);
      const item = await getFloorById(id);
      setFloors(item ? [item] : []);
      setError('');
    } catch (e) {
      setFloors([]);
      setError(e?.message || 'No floor found for the provided ID');
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = async () => {
    setSearchId('');
    await reloadAll();
  };

  const openCreate = () => {
    setCreateForm({ building_id: '', floor_no: '' });
    setCreateError('');
    setCreating(true);
  };

  const cancelCreate = () => {
    setCreating(false);
    setCreateForm({ building_id: '', floor_no: '' });
    setCreateError('');
  };

  const submitCreate = async () => {
    const floorNo = Number(createForm.floor_no);
    const bId = Number(createForm.building_id);
    if (!Number.isInteger(bId) || bId <= 0) { setCreateError('Please select a building'); return; }
    if (!Number.isInteger(floorNo) || floorNo < 0) { setCreateError('Floor number must be a non-negative integer'); return; }
    try {
      const b = buildingMap[bId];
      await createFloor({
        building_id: bId,
        floor_no: floorNo,
        rows: Number(b?.rows) || 0,
        columns: Number(b?.columns) || 0,
      });
      cancelCreate();
      await reloadAll();
    } catch (e) {
      setCreateError(e?.message || 'Failed to create floor');
    }
  };

  const startEdit = (floor) => {
    setEditingId(floor.floor_id);
    setEditForm({ floor_no: floor.floor_no });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ floor_no: '' });
  };

  const saveEdit = async (idOverride) => {
    const targetId = idOverride ?? editingId;
    if (targetId === null || targetId === undefined) { openModal('Edit error', 'No floor selected'); return; }
    const floorNo = Number(editForm.floor_no);
    if (!Number.isInteger(floorNo) || floorNo < 0) { openModal('Validation', 'Floor number must be a non-negative integer'); return; }
    try {
      await patchFloor(targetId, { floor_no: floorNo });
      setFloors((prev) => prev.map(f => (f.floor_id === targetId ? { ...f, floor_no: floorNo } : f)));
      cancelEdit();
    } catch (e) {
      openModal('Save error', e?.message || 'Failed to update floor');
    }
  };

  const removeSingle = async (id) => {
    try {
      await deleteFloor(id);
      setFloors((prev) => prev.filter(f => f.floor_id !== id));
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    } catch (e) {
      openModal('Delete error', e?.message || 'Failed to delete floor');
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      await deleteFloorsBulk(ids);
      setFloors((prev) => prev.filter(f => !selectedIds.has(f.floor_id)));
      setSelectedIds(new Set());
    } catch (e) {
      openModal('Delete error', e?.message || 'Failed to delete selected floors');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Floor Management</h2>
            <p className="page-subtitle">Manage floors across all buildings — rows/columns are defined at building level and apply to all floors.</p>
          </div>
          <div className="roles-toolbar">
            <div className="roles-search">
              <input
                className="search-input"
                type="text"
                inputMode="numeric"
                placeholder="Search by Floor ID"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              />
              <button className="primary-btn sm" onClick={handleSearch} disabled={loading}>Search</button>
              <button className="secondary-btn sm" onClick={clearSearch} disabled={loading}>Clear</button>
            </div>
            <button className="primary-btn" onClick={openCreate}>+ Add Floor</button>
            <button className="danger-btn" onClick={bulkDelete} disabled={selectedIds.size === 0}>Delete Selected</button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="no-results">Loading floors...</div>
        ) : (
          <div className="roles-table">
            <div className="roles-table-header" style={{ gridTemplateColumns: '48px 1fr 1.2fr 1fr 1fr 220px' }}>
              <div className="cell checkbox">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
              </div>
              <div className="cell">Floor No</div>
              <div className="cell">Building</div>
              <div className="cell">Rows (read-only)</div>
              <div className="cell">Columns (read-only)</div>
              <div className="cell actions">Actions</div>
            </div>

            {floors.length === 0 ? (
              <div className="no-results">No floors found.</div>
            ) : (
              floors.map((f) => (
                <div key={f.floor_id} className={`roles-table-row ${selectedIds.has(f.floor_id) ? 'selected' : ''}`} style={{ gridTemplateColumns: '48px 1fr 1.2fr 1fr 1fr 220px' }}>
                  <div className="cell checkbox">
                    <input type="checkbox" checked={selectedIds.has(f.floor_id)} onChange={() => toggleSelect(f.floor_id)} />
                  </div>
                  {editingId === f.floor_id ? (
                    <>
                      <div className="cell">
                        <input type="number" min="0" value={editForm.floor_no} onChange={(e) => setEditForm({ floor_no: e.target.value })} />
                      </div>
                      <div className="cell">{buildingMap[Number(f.building_id)]?.name || `Building ${f.building_id}`}</div>
                      <div className="cell">{buildingMap[Number(f.building_id)]?.rows ?? f.rows}</div>
                      <div className="cell">{buildingMap[Number(f.building_id)]?.columns ?? f.columns}</div>
                      <div className="cell actions">
                        <button className="primary-btn sm" onClick={() => saveEdit(f.floor_id)}>Save</button>
                        <button className="secondary-btn sm" onClick={cancelEdit}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="cell">{f.floor_no}</div>
                      <div className="cell">{buildingMap[Number(f.building_id)]?.name || `Building ${f.building_id}`}</div>
                      <div className="cell">{buildingMap[Number(f.building_id)]?.rows ?? f.rows}</div>
                      <div className="cell">{buildingMap[Number(f.building_id)]?.columns ?? f.columns}</div>
                      <div className="cell actions">
                        <button className="secondary-btn sm" onClick={() => startEdit(f)}>Edit</button>
                        <button className="danger-btn sm" onClick={() => removeSingle(f.floor_id)}>Delete</button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Create Floor Modal */}
        <FormModal
          open={creating}
          title="Add Floor"
          onCancel={cancelCreate}
          footer={(
            <>
              <button type="button" className="primary-btn" onClick={submitCreate}>Create</button>
              <button type="button" className="secondary-btn" onClick={cancelCreate}>Cancel</button>
            </>
          )}
        >
          {createError && (<div className="error-banner" style={{ marginBottom: 12 }}>{createError}</div>)}
          <div className="role-card create-card">
            <div className="field">
              <label>Building</label>
              <select value={createForm.building_id} onChange={(e) => setCreateForm((prev) => ({ ...prev, building_id: e.target.value }))}>
                <option value="">Select a building</option>
                {(buildings || []).map((b) => (
                  <option key={b.building_id} value={b.building_id}>{b.name || `Building ${b.building_id}`}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Floor No</label>
              <input type="number" min="0" value={createForm.floor_no} onChange={(e) => setCreateForm({ floor_no: e.target.value, building_id: createForm.building_id })} />
            </div>
            <div className="field">
              <label>Rows (inherited from building)</label>
              <input type="number" value={buildingMap[Number(createForm.building_id)]?.rows ?? ''} readOnly disabled />
            </div>
            <div className="field">
              <label>Columns (inherited from building)</label>
              <input type="number" value={buildingMap[Number(createForm.building_id)]?.columns ?? ''} readOnly disabled />
            </div>
          </div>
        </FormModal>

        <Modal open={modal.open} title={modal.title} onCancel={closeModal} cancelText="Close">
          {modal.message}
        </Modal>
      </div>
    </div>
  );
};

export default FloorManagementPage;
