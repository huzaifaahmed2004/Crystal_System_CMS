import React, { useEffect, useMemo, useState } from 'react';
import '../styles/floor-management.css';
import { getBuildings } from '../services/buildingService';
import { getFloors, deleteFloor, deleteFloorsBulk } from '../services/floorService';
import Modal from '../components/ui/Modal';
import { useAppContext } from '../context/AppContext';

const FloorManagementPage = () => {
  const { setActiveSection, setFloorFormMode, setFloorId } = useAppContext();
  const [buildings, setBuildings] = useState([]);
  const buildingMap = useMemo(() => Object.fromEntries((buildings || []).map(b => [Number(b.building_id), b])), [buildings]);
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // remove inline create/edit; handled in FloorDetailPage

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
        const fl = Array.isArray(list) ? list : [];
        setFloors(fl);
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

  const splitDateTime = (v) => {
    if (!v) return { date: '-', time: '' };
    try {
      const d = new Date(v);
      if (isNaN(d.getTime())) return { date: String(v), time: '' };
      return { date: d.toLocaleDateString(), time: d.toLocaleTimeString() };
    } catch {
      return { date: String(v), time: '' };
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const filteredFloors = useMemo(() => {
    const term = String(searchTerm || '').trim().toLowerCase();
    if (!term) return floors;
    return floors.filter(f => {
      const code = String(f?.floor_code || '').toLowerCase();
      const name = String(f?.name || '').toLowerCase();
      const buildingName = String(buildingMap[Number(f?.building_id)]?.name || '').toLowerCase();
      return code.includes(term) || name.includes(term) || buildingName.includes(term);
    });
  }, [floors, searchTerm, buildingMap]);

  const goToCreate = () => {
    setFloorFormMode('create');
    setFloorId(null);
    setActiveSection('floor-detail');
  };

  const goToEdit = (id) => {
    setFloorFormMode('edit');
    setFloorId(id);
    setActiveSection('floor-detail');
  };

  // creation handled on FloorDetailPage

  // edit handled on FloorDetailPage

  // inline cancel/edit removed

  // inline save removed

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
    <div className="page-container floor-page">
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
                placeholder="Search by code, name, building"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { /* client filter only */ } }}
              />
              <button className="secondary-btn sm" onClick={() => setSearchTerm('')} disabled={loading}>Clear</button>
            </div>
            <button className="primary-btn" onClick={goToCreate}>+ Add Floor</button>
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
            <div className="roles-table-header">
              <div className="cell checkbox">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
              </div>
              <div className="cell">Code</div>
              <div className="cell">Name</div>
              <div className="cell">Building</div>
              <div className="cell updated-at">Updated At</div>
              <div className="cell created-at">Created At</div>
              <div className="cell actions">Actions</div>
            </div>

            {filteredFloors.length === 0 ? (
              <div className="no-results">No floors found.</div>
            ) : (
              filteredFloors.map((f) => (
                <div key={f.floor_id} className={`roles-table-row ${selectedIds.has(f.floor_id) ? 'selected' : ''}`}>
                  <div className="cell checkbox">
                    <input type="checkbox" checked={selectedIds.has(f.floor_id)} onChange={() => toggleSelect(f.floor_id)} />
                  </div>
                  <div className="cell">{f.floor_code}</div>
                  <div className="cell">{f.name}</div>
                  <div className="cell">{buildingMap[Number(f.building_id)]?.name || `Building ${f.building_id}`}</div>
                  <div className="cell updated-at">
                    {(() => { const s = splitDateTime(f.updated_at); return (
                      <div className="datetime"><span className="date">{s.date}</span><span className="time">{s.time}</span></div>
                    ); })()}
                  </div>
                  <div className="cell created-at">
                    {(() => { const s = splitDateTime(f.created_at); return (
                      <div className="datetime"><span className="date">{s.date}</span><span className="time">{s.time}</span></div>
                    ); })()}
                  </div>
                  <div className="cell actions">
                    <button className="secondary-btn sm" onClick={() => goToEdit(f.floor_id)}>Edit</button>
                    <button className="danger-btn sm" onClick={() => removeSingle(f.floor_id)}>Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <Modal open={modal.open} title={modal.title} onCancel={closeModal} cancelText="Close">
          {modal.message}
        </Modal>
      </div>
    </div>
  );
};

export default FloorManagementPage;
